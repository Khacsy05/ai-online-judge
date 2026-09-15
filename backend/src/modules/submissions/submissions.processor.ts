import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { JudgeStatus } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { SubmissionsGateway } from './submissions.gateway';
import { Judge0Service } from './judge0.service';

@Processor('judging')
export class SubmissionsProcessor extends WorkerHost {
    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
        private readonly submissionsGateway: SubmissionsGateway,
        private readonly judge0Service: Judge0Service,
    ) { super(); }

    // Hàm này tự động chạy khi có job mới được lấy ra từ hàng đợi Redis
    async process(job: Job<{ submissionId: string }>): Promise<any> {
        const { submissionId } = job.data;
        const jobStartTime = Date.now();
        console.log(`⏳ Bắt đầu chấm bài cho Submission ID: ${submissionId}`);

        // 1. Kiểm tra nếu bài nộp đã bị huỷ trước khi bắt đầu
        const checkBeforeStart = await this.prisma.submission.findUnique({
            where: { id: submissionId },
            select: { status: true },
        });
        if (checkBeforeStart?.status === JudgeStatus.CANCELLED) {
            console.log(`🛑 [Judge0] Bài nộp ${submissionId} đã bị huỷ trước khi chạy.`);
            return;
        }

        // Chuyển trạng thái bài nộp sang RUNNING (Đang chấm) dưới DB
        await this.prisma.submission.update({
            where: { id: submissionId },
            data: { status: JudgeStatus.RUNNING },
        });

        try {
            // Lấy chi tiết code bài nộp kèm Test Cases và thông tin bài tập
            const submission = await this.prisma.submission.findUnique({
                where: { id: submissionId },
                include: {
                    assignment: {
                        include: {
                            problem: {
                                include: {
                                    testCases: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!submission) return;

            const problem = submission.assignment.problem;
            const testCases = problem.testCases || [];
            const languageId = this.judge0Service.getLanguageId(submission.language);

            let overallStatus: JudgeStatus = JudgeStatus.ACCEPTED;
            let totalEarnedScore = 0;
            let maxExecutionTimeMs = 0;
            let maxMemoryUsedKb = 0;
            const detailsData: Array<{
                submissionId: string;
                testCaseId: string;
                status: JudgeStatus;
                actualOutput: string | null;
                errorMessage: string | null;
                executionTimeMs: number | null;
            }> = [];

            let firstFailedTestInfo: string | null = null;
            let tStartJudge0 = Date.now();

            // ==================== CHẤM BẰNG JUDGE0 NẾU HỖ TRỢ ====================
            if (languageId && testCases.length > 0) {
                console.log(`🚀 [Judge0] Đang chấm ${testCases.length} test cases cho ngôn ngữ: ${submission.language} (ID: ${languageId})`);

                const timeLimitMs = problem.timeLimitMs || 1000;
                const memoryLimitMb = problem.memoryLimitMb || 256;

                let codeToExecute = submission.sourceCode;
                // Nếu là Java, tự động chuẩn hoá tên class chính thành Main để tránh lỗi biên dịch của Judge0
                if (languageId === 62) {
                    codeToExecute = codeToExecute.replace(/public\s+class\s+[A-Za-z0-9_]+/g, 'public class Main');
                }

                // ==================== CHẤM SONG SONG TẤT CẢ TEST CASES ====================
                tStartJudge0 = Date.now();
                const testCasePromises = testCases.map(async (tc, index) => {
                    const tcStartTime = Date.now();
                    try {
                        const execResult = await this.judge0Service.executeSingleTestCase(
                            codeToExecute,
                            languageId,
                            tc.input || '',
                            tc.expectedOutput || '',
                            timeLimitMs,
                            memoryLimitMb,
                        );
                        console.log(`⏱️ [Judge0] Test #${index + 1} (${tc.id}) chấm xong trong ${Date.now() - tcStartTime}ms | Status: ${execResult.status?.description}`);
                        return { tc, index, execResult, error: null };
                    } catch (judgeErr: any) {
                        console.error(`❌ [Judge0] Lỗi khi chạy test case #${index + 1} (${tc.id}):`, judgeErr.message);
                        return { tc, index, execResult: null, error: judgeErr.message || 'Lỗi hệ thống chấm Judge0' };
                    }
                });

                // Chạy đồng thời tất cả các test cases cùng một lúc
                const results = await Promise.all(testCasePromises);

                // Kiểm tra nếu người dùng đã bấm HỦY trong lúc đang chấm
                const checkAfterBatch = await this.prisma.submission.findUnique({
                    where: { id: submissionId },
                    select: { status: true },
                });
                if (checkAfterBatch?.status === JudgeStatus.CANCELLED) {
                    console.log(`🛑 [Judge0] Hủy kết quả bài nộp ${submissionId} vì đã bị hủy bởi người dùng.`);
                    return;
                }

                // Tổng hợp kết quả từ các test case đã chạy
                for (const res of results) {
                    const { tc, index, execResult, error } = res;

                    if (execResult) {
                        const statusString = this.judge0Service.mapJudge0Status(execResult.status.id);
                        const statusEnum: JudgeStatus = JudgeStatus[statusString] || JudgeStatus.WRONG_ANSWER;

                        const timeMs = execResult.time ? Math.round(parseFloat(execResult.time) * 1000) : 0;
                        const memKb = execResult.memory || 0;

                        if (timeMs > maxExecutionTimeMs) maxExecutionTimeMs = timeMs;
                        if (memKb > maxMemoryUsedKb) maxMemoryUsedKb = memKb;

                        const output = execResult.stdout ? execResult.stdout.trim() : null;
                        const err = execResult.compile_output || execResult.stderr || execResult.message || null;

                        if (statusEnum === JudgeStatus.ACCEPTED) {
                            totalEarnedScore += tc.score || 1;
                        } else {
                            console.error(`⚠️ [Judge0 Test #${index + 1} Failed] Status: ${statusEnum} | Error Output:`, err || execResult.message || execResult.stderr);
                            if (overallStatus === JudgeStatus.ACCEPTED || statusEnum === JudgeStatus.COMPILATION_ERROR) {
                                overallStatus = statusEnum;
                            }
                            if (!firstFailedTestInfo) {
                                firstFailedTestInfo = `Testcase #${index + 1}: Input: "${tc.input}", Expected: "${tc.expectedOutput}", Actual: "${output || '(trống)'}", Error: "${err || 'Không khớp kết quả'}"`;
                            }
                        }

                        detailsData.push({
                            submissionId,
                            testCaseId: tc.id,
                            status: statusEnum,
                            actualOutput: output,
                            errorMessage: err,
                            executionTimeMs: timeMs,
                        });
                    } else {
                        overallStatus = JudgeStatus.RUNTIME_ERROR;
                        detailsData.push({
                            submissionId,
                            testCaseId: tc.id,
                            status: JudgeStatus.RUNTIME_ERROR,
                            actualOutput: null,
                            errorMessage: error,
                            executionTimeMs: 0,
                        });
                    }
                }
            } else {
                console.warn(`⚠️ Ngôn ngữ "${submission.language}" hoặc không có testcase. Chuyển sang chấm cơ bản.`);
                overallStatus = JudgeStatus.ACCEPTED;
                totalEarnedScore = 10;
            }

            // Quy đổi điểm thang điểm 10
            const totalMaxScore = testCases.reduce((acc, curr) => acc + (curr.score || 1), 0);
            const finalScore10 = totalMaxScore > 0
                ? Math.round((totalEarnedScore / totalMaxScore) * 10 * 10) / 10
                : 10;

            const tAfterJudge0 = Date.now();
            console.log(`⏱️ [Timeline] Judge0 song song hoàn thành trong: ${tAfterJudge0 - tStartJudge0}ms`);

            // ==================== TẠO FEEDBACK NHẬN XÉT ====================
            let feedback = '';
            if (overallStatus === JudgeStatus.ACCEPTED || finalScore10 >= 10) {
                feedback = '';
            } else {
                // Nhờ AI gợi ý lỗi ngắn gọn nếu code bị lỗi
                try {
                    const aiPrompt = `
                        Sinh viên nộp bài lập trình gặp lỗi:
                        - Ngôn ngữ: ${submission.language}
                        - Đề bài: ${problem.title}
                        - Trạng thái: ${overallStatus}
                        - Chi tiết testcase sai: ${firstFailedTestInfo || 'Kết quả chạy không khớp'}
                        - Code sinh viên:
                        ${submission.sourceCode.substring(0, 800)}
                        
                        YÊU CẦU BẮT BUỘC:
                        - Chỉ viết DUY NHẤT 1 đến 2 câu ngắn gọn (dưới 50 từ).
                        - Nêu thẳng lý do sai và cách sửa. Tuyệt đối không chào hỏi, không dông dài, không chia mục 1 2 3.
                    `;
                    feedback = (await this.aiService.generateText(aiPrompt)).trim();
                } catch (e) {
                    feedback = `Bài làm chưa chính xác (${overallStatus}). Vui lòng kiểm tra lại thuật toán và các trường hợp biên.`;
                }
            }

            const tAfterAI = Date.now();
            console.log(`⏱️ [Timeline] AI feedback hoàn thành trong: ${tAfterAI - tAfterJudge0}ms`);

            // Kiểm tra lần cuối xem sinh viên có bấm HUỶ trong lúc xử lý hay không
            const finalCheck = await this.prisma.submission.findUnique({
                where: { id: submissionId },
                select: { status: true },
            });
            if (finalCheck?.status === JudgeStatus.CANCELLED) {
                console.log(`🛑 [Judge0] Huỷ cập nhật DB bài ${submissionId} vì đã bị huỷ trước đó.`);
                return;
            }

            // 1. BẮN SOCKET.IO KẾT QUẢ NGAY LẬP TỨC CHO SINH VIÊN (Không để sinh viên đợi DB)
            this.submissionsGateway.sendGradingResult(submission.userId, {
                submissionId,
                assignmentId: submission.assignmentId,
                classroomId: submission.assignment.classroomId,
                status: overallStatus,
                totalScore: finalScore10,
                executionTimeMs: maxExecutionTimeMs,
                memoryUsedKb: maxMemoryUsedKb,
                feedback: feedback.trim(),
                studentTotalScore: 0,
                maxClassScore: 0,
                totalAssignments: 0,
                solvedCount: 0,
                progressPercentage: 0,
            });

            const tSocketSent = Date.now();
            console.log(`🚀 [Fast Response] Đã bắn Socket kết quả tới sinh viên chỉ sau: ${tSocketSent - jobStartTime}ms!`);

            // 2. Chạy lưu Database và cập nhật tiến độ ở phía sau (Background)
            (async () => {
                try {
                    await this.prisma.submission.update({
                        where: { id: submissionId },
                        data: {
                            status: overallStatus,
                            totalScore: finalScore10,
                            executionTimeMs: maxExecutionTimeMs,
                            memoryUsedKb: maxMemoryUsedKb,
                        },
                    });

                    if (detailsData.length > 0) {
                        await this.prisma.submissionDetail.createMany({
                            data: detailsData,
                        });
                    }

                    // Tính toán tiến độ lớp học
                    const classroomId = submission.assignment.classroomId;
                    const classAssignments = await this.prisma.assignment.findMany({
                        where: { classroomId },
                        select: { id: true },
                    });

                    const totalAssignments = classAssignments.length;
                    const maxClassScore = totalAssignments * 10;
                    const classAssignmentIds = classAssignments.map(a => a.id);

                    const studentClassSubmissions = await this.prisma.submission.findMany({
                        where: {
                            userId: submission.userId,
                            assignmentId: { in: classAssignmentIds },
                            status: { not: JudgeStatus.CANCELLED },
                        },
                        select: {
                            assignmentId: true,
                            totalScore: true,
                            status: true,
                        },
                    });

                    const maxScorePerAssignment: Record<string, number> = {};
                    const solvedAssignmentsSet = new Set<string>();

                    for (const sub of studentClassSubmissions) {
                        const current = maxScorePerAssignment[sub.assignmentId] || 0;
                        if (sub.totalScore > current) {
                            maxScorePerAssignment[sub.assignmentId] = sub.totalScore;
                        }
                        if (sub.status === JudgeStatus.ACCEPTED) {
                            solvedAssignmentsSet.add(sub.assignmentId);
                        }
                    }

                    let studentTotalScore = 0;
                    for (const aId of classAssignmentIds) {
                        studentTotalScore += maxScorePerAssignment[aId] || 0;
                    }

                    const solvedCount = solvedAssignmentsSet.size;
                    const progressPercentage = maxClassScore > 0
                        ? Math.round((studentTotalScore / maxClassScore) * 10000) / 100
                        : 0;

                    // Gửi update tiến độ hoàn thiện
                    this.submissionsGateway.sendGradingResult(submission.userId, {
                        submissionId,
                        assignmentId: submission.assignmentId,
                        classroomId,
                        status: overallStatus,
                        totalScore: finalScore10,
                        executionTimeMs: maxExecutionTimeMs,
                        memoryUsedKb: maxMemoryUsedKb,
                        feedback: feedback.trim(),
                        studentTotalScore: Math.round(studentTotalScore * 100) / 100,
                        maxClassScore,
                        totalAssignments,
                        solvedCount,
                        progressPercentage,
                    });
                } catch (dbErr) {
                    console.error(`❌ Lỗi lưu DB ngầm:`, dbErr);
                }
            })();

            const totalDuration = Date.now() - jobStartTime;
            console.log(`⚡ Xử lý chấm hoàn tất cho Submission ID: ${submissionId} | Tổng thời gian worker: ${totalDuration}ms`);
        } catch (error) {
            console.error(`❌ Lỗi khi chấm bài ${submissionId}:`, error);
            await this.prisma.submission.update({
                where: { id: submissionId },
                data: { status: JudgeStatus.RUNTIME_ERROR },
            });
            throw error;
        }
    }
}

