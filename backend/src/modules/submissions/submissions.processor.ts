import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { JudgeStatus } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { Submission, TestCase } from '@prisma/client';

interface ProblemTestCase extends TestCase {
    _count: { submissions: number };
}

interface TestCaseResult {
    testCaseId: string;
    status: 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR';
    actualOutput?: string;
    errorMessage?: string;
    executionTimeMs?: number;
}

interface GradingResult {
    status: 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR';
    totalScore: number;
    feedback: string;
    executionTimeMs?: number;
    memoryUsedKb?: number;
    testCaseResults: TestCaseResult[];
}

const gradingSchema = {
    type: 'OBJECT',
    properties: {
        status: {
            type: 'STRING',
            enum: ['ACCEPTED', 'WRONG_ANSWER', 'COMPILATION_ERROR', 'RUNTIME_ERROR']
        },
        totalScore: { type: 'NUMBER' },
        feedback: { type: 'STRING' },
        executionTimeMs: { type: 'NUMBER' },
        memoryUsedKb: { type: 'NUMBER' },
        testCaseResults: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    testCaseId: { type: 'STRING' },
                    status: {
                        type: 'STRING',
                        enum: ['ACCEPTED', 'WRONG_ANSWER', 'COMPILATION_ERROR', 'RUNTIME_ERROR']
                    },
                    actualOutput: { type: 'STRING' },
                    errorMessage: { type: 'STRING' },
                    executionTimeMs: { type: 'NUMBER' }
                },
                required: ['testCaseId', 'status']
            }
        }
    },
    required: ['status', 'totalScore', 'feedback', 'executionTimeMs', 'memoryUsedKb', 'testCaseResults'],
};

@Processor('judging')
export class SubmissionsProcessor extends WorkerHost {
    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService,
    ) { super(); }

    // Hàm này tự động chạy khi có job mới được lấy ra từ hàng đợi Redis
    async process(job: Job<{ submissionId: string }>): Promise<any> {
        const { submissionId } = job.data;
        console.log(`⏳ Bắt đầu chấm bài cho Submission ID: ${submissionId}`);

        // 1. Chuyển trạng thái bài nộp sang RUNNING (Đang chấm) dưới DB
        await this.prisma.submission.update({
            where: { id: submissionId },
            data: { status: JudgeStatus.RUNNING },
        });

        try {
            // Lấy chi tiết code bài nộp
            const submission = await this.prisma.submission.findUnique({
                where: { id: submissionId },
                include: { assignment: { include: { problem: { include: { testCases: true } } } } }
            });

            if (!submission) return;

            const testCasesStr = submission.assignment.problem.testCases
                .map((tc, idx) => `Testcase ${idx + 1}: ID: "${tc.id}", Input: "${tc.input}", Expected: "${tc.expectedOutput}" (Trọng số: ${tc.score})`)
                .join('\n');

            const prompt = `
                Bạn là một hệ thống chấm bài lập trình tự động (Online Judge) sử dụng AI.
                Hãy đánh giá bài làm của sinh viên dựa trên thông tin sau:
                --- ĐỀ BÀI ---
                Tiêu đề: ${submission.assignment.problem.title}
                Mô tả: ${submission.assignment.problem.description}
                --- NGÔN NGỮ LẬP TRÌNH ---
                ${submission.language}
                --- CÁC TEST CASES ĐỂ ĐỐI CHIẾU ---
                ${testCasesStr}
                --- BÀI LÀM (MÃ NGUỒN) CỦA SINH VIÊN ---
                ${submission.sourceCode}
                Yêu cầu chấm bài:
                1. Đọc hiểu thuật toán của sinh viên và kiểm tra tính chính xác so với đề bài.
                2. Đánh giá tính chính xác của code trên TỪNG test case. Với mỗi test case, hãy xác định xem kết quả chạy code có trùng khớp với expectedOutput hay không để đưa ra kết quả cho testcase đó.
                3. Quyết định trạng thái bài nộp (status):
                - 'ACCEPTED' nếu đúng hoàn toàn tất cả các testcase.
                - 'WRONG_ANSWER' nếu code chạy sai ít nhất 1 testcase hoặc thuật toán sai.
                - 'COMPILATION_ERROR' nếu code có lỗi cú pháp nghiêm trọng không thể chạy được.
                4. Tính tổng điểm (totalScore) bằng tổng trọng số điểm của các testcases vượt qua.
                5. Viết một lời nhận xét ngắn gọn (feedback) bằng tiếng Việt chỉ ra lỗi sai (nếu có) hoặc hướng tối ưu.
                6. Ước lượng/Tính toán tổng thời gian thực thi (executionTimeMs) tính bằng mili-giây (ví dụ: 15, 120) và dung lượng bộ nhớ sử dụng (memoryUsedKb) tính bằng kilobyte (ví dụ: 512, 2048) của toàn bộ bài làm khi chạy trên các testcases. Nếu code bị lỗi biên dịch (COMPILATION_ERROR), hãy để các giá trị này bằng 0.
                7. Trả về thông tin chi tiết của từng testcase trong mảng 'testCaseResults'. Mỗi phần tử trong mảng phải chứa đúng 'testCaseId' đã được cung cấp tương ứng.
                Yêu cầu: Trả về đúng định dạng JSON mà tôi đã định nghĩa. Không thêm bất kỳ ký tự giải thích nào bên ngoài JSON.
            `;

            const result = await this.aiService.generateJson<GradingResult>(
                prompt,
                gradingSchema
            );

            console.log(`✅ Đã chấm xong bài: ${submissionId} | Kết quả: ${result.status} | Điểm: ${result.totalScore}`);

            // 2. Cập nhật trạng thái, điểm tổng quan, thời gian chạy và bộ nhớ sử dụng của bài nộp
            await this.prisma.submission.update({
                where: { id: submissionId },
                data: {
                    status: result.status,
                    totalScore: result.totalScore,
                    executionTimeMs: result.executionTimeMs || 0,
                    memoryUsedKb: result.memoryUsedKb || 0,
                },
            });

            // 3. Tạo chi tiết kết quả chạy cho từng testcase
            if (result.testCaseResults && result.testCaseResults.length > 0) {
                const detailsData = result.testCaseResults.map(tcResult => ({
                    submissionId: submissionId,
                    testCaseId: tcResult.testCaseId,
                    status: tcResult.status,
                    actualOutput: tcResult.actualOutput || null,
                    errorMessage: tcResult.errorMessage || null,
                    executionTimeMs: tcResult.executionTimeMs || null,
                }));

                await this.prisma.submissionDetail.createMany({
                    data: detailsData,
                });
            }

            console.log(`✅ Chấm bài hoàn tất cho Submission ID: ${submissionId}`);
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
