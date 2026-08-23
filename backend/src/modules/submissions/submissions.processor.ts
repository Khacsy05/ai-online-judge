import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { JudgeStatus } from '@prisma/client';

@Processor('judging')
export class SubmissionsProcessor extends WorkerHost {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

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

            // ==========================================
            // TODO: ĐÂY LÀ NƠI VIẾT CODE GỌI SANG AI HOẶC CHẠY COMPILER CHẤM BÀI
            // ==========================================

            // Giả lập xử lý chấm bài mất 3 giây
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // 2. Chấm xong cập nhật trạng thái kết quả (Ví dụ giả lập ACCEPTED)
            await this.prisma.submission.update({
                where: { id: submissionId },
                data: {
                    status: JudgeStatus.ACCEPTED,
                    totalScore: 10.0,
                    executionTimeMs: 120,
                    memoryUsedKb: 1024,
                },
            });

            console.log(`✅ Chấm bài hoàn tất cho Submission ID: ${submissionId}`);
        } catch (error) {
            console.error(`❌ Lỗi khi chấm bài ${submissionId}:`, error);

            // Nếu lỗi, cập nhật sang lỗi hệ thống
            await this.prisma.submission.update({
                where: { id: submissionId },
                data: { status: JudgeStatus.RUNTIME_ERROR },
            });
            throw error; // Ném lỗi để BullMQ biết và thực hiện retry (attempts) nếu cần
        }
    }
}
