import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma, JudgeStatus } from '@prisma/client';
import { QuerySubmissionsDto } from './dto/query-submissions-dto';
import { AiService } from '../ai/ai.service';

// Danh sách các pattern bị cấm theo từng ngôn ngữ (hạn chế tối đa false positive)
const MALICIOUS_PATTERNS: Record<string, { pattern: RegExp; reason: string }[]> = {
  python: [
    { pattern: /\bimport\s+(os|subprocess|socket|pty|shutil)\b/, reason: 'sử dụng thư viện hệ thống/mạng (os, subprocess, socket, pty, shutil)' },
    { pattern: /\bfrom\s+(os|subprocess|socket|pty|shutil)\s+import\b/, reason: 'import từ thư viện hệ thống/mạng' },
    { pattern: /\b(eval|exec)\s*\(/, reason: 'hàm thực thi chuỗi động (eval/exec)' },
    { pattern: /__import__\s*\(/, reason: 'hàm nạp module động (__import__)' },
  ],
  cpp: [
    { pattern: /#include\s*<sys\//i, reason: 'include thư vien hệ thống (<sys/...>)' },
    { pattern: /#include\s*<unistd\.h>/i, reason: 'include thư viện POSIX (<unistd.h>)' },
    { pattern: /#include\s*<windows\.h>/i, reason: 'include thư viện Windows API (<windows.h>)' },
    { pattern: /\bfork\s*\(/, reason: 'gọi hàm nhân bản tiến trình fork()' },
    { pattern: /\bsystem\s*\(/, reason: 'gọi lệnh shell hệ thống system()' },
  ],
  java: [
    { pattern: /Runtime\.getRuntime\s*\(\)/, reason: 'truy cập Runtime hệ thống' },
    { pattern: /ProcessBuilder/, reason: 'khởi tạo tiến trình bên ngoài (ProcessBuilder)' },
    { pattern: /java\.net\./, reason: 'kết nối mạng (java.net)' },
    { pattern: /System\.exit\s*\(/, reason: 'gọi System.exit() làm gián đoạn môi trường chấm' },
  ],
};

function checkMaliciousCode(sourceCode: string, language: string) {
  const rules = MALICIOUS_PATTERNS[language.toLowerCase()];
  if (!rules) return;

  for (const rule of rules) {
    if (rule.pattern.test(sourceCode)) {
      throw new BadRequestException(
        `Bài làm bị từ chối vì lý do an toàn hệ thống: Phát hiện ${rule.reason}. Vui lòng chỉ sử dụng các thư viện thuật toán tiêu chuẩn!`
      );
    }
  }
}

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('judging') private readonly judgingQueue: Queue,
    private readonly aiService: AiService,
  ) { }

  async create(file: Express.Multer.File, assignmentId: string, req: any) {
    // 1. Detect file extension and map to programming language
    const filename = file.originalname;
    const parts = filename.split('.');
    const userId = req.user.id as any;
    if (parts.length < 2) {
      throw new BadRequestException('Tên file không hợp lệ (thiếu phần mở rộng).');
    }
    const ext = parts.pop()?.toLowerCase();

    let language = '';
    switch (ext) {
      case 'cpp':
      case 'cc':
      case 'cxx':
        language = 'cpp';
        break;
      case 'py':
      case 'py3':
        language = 'python';
        break;
      case 'java':
        language = 'java';
        break;
      case 'js':
        language = 'javascript';
        break;
      case 'ts':
        language = 'typescript';
        break;
      case 'go':
        language = 'go';
        break;
      default:
        throw new BadRequestException(
          `Định dạng file .${ext} không được hỗ trợ. Vui lòng nộp các file: .cpp, .py, .java, .js, .ts, hoặc .go`,
        );
    }

    // 2. Read the source code text from the buffer
    const sourceCode = file.buffer.toString('utf8');
    if (!sourceCode.trim()) {
      throw new BadRequestException('Nội dung file bài làm không được rỗng.');
    }

    // 🛡️ BẢO MẬT TẦNG 1: Kiểm tra an toàn mã nguồn trước khi ghi vào Database hoặc gửi đi chấm
    checkMaliciousCode(sourceCode, language);

    // 3. Verify if user (student) exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`Sinh viên với ID "${userId}" không tồn tại.`);
    }

    // 4. Verify if assignment exists
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException(`Bài tập (Assignment) với ID "${assignmentId}" không tồn tại.`);
    }

    // 5. Cancel any previous submissions that are currently in PENDING or RUNNING status
    await this.prisma.submission.updateMany({
      where: {
        userId,
        assignmentId,
        status: {
          in: ['PENDING', 'RUNNING'],
        },
      },
      data: {
        status: 'CANCELLED',
      },
    });

    // 6. Store the submission in database with PENDING status
    const submission = await this.prisma.submission.create({
      data: {
        userId,
        assignmentId,
        sourceCode,
        language,
        status: 'PENDING',
      },
    });
    await this.judgingQueue.add(
      'gradeSubmission',
      { submissionId: submission.id },
      {
        attempts: 3,
        backoff: 5000,
      }
    );
    return submission;
  }

  async findAll(query: QuerySubmissionsDto) {
    const { userId, assignmentId, classroomId, search, status, language } = query;
    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query.limit) > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.SubmissionWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (assignmentId) {
      where.assignmentId = assignmentId;
    }

    if (classroomId && classroomId !== 'ALL') {
      where.assignment = {
        ...(where.assignment as any),
        classroomId,
      };
    }

    if (status && (status as any) !== 'ALL') {
      where.status = status;
    }

    if (language && language !== 'ALL') {
      where.language = language.toLowerCase();
    }

    if (search && search.trim()) {
      const keyword = search.trim();
      where.OR = [
        {
          assignment: {
            problem: {
              title: {
                contains: keyword,
              },
            },
          },
        },
        {
          user: {
            fullName: {
              contains: keyword,
            },
          },
        },
        {
          user: {
            studentCode: {
              contains: keyword,
            },
          },
        },
      ];
    }

    // Query danh sách phân trang và tổng số lượng bản ghi
    const [total, items] = await Promise.all([
      this.prisma.submission.count({ where }),
      this.prisma.submission.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              studentCode: true,
            },
          },
          assignment: {
            select: {
              id: true,
              classroomId: true,
              classroom: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
              problem: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    // Tính số liệu thống kê tổng thể nếu có userId
    let stats: {
      total: number;
      acceptedCount: number;
      rate: number;
      avgScore: string;
    } | null = null;
    if (userId) {
      const [userTotal, userAccepted, avgScoreAggregate] = await Promise.all([
        this.prisma.submission.count({
          where: { userId, status: { not: JudgeStatus.CANCELLED } },
        }),
        this.prisma.submission.count({
          where: { userId, status: JudgeStatus.ACCEPTED },
        }),
        this.prisma.submission.aggregate({
          where: { userId, status: { not: JudgeStatus.CANCELLED } },
          _avg: { totalScore: true },
        }),
      ]);

      const rate = userTotal > 0 ? Math.round((userAccepted / userTotal) * 100) : 0;
      const avgScore = (avgScoreAggregate._avg.totalScore || 0).toFixed(1);

      stats = {
        total: userTotal,
        acceptedCount: userAccepted,
        rate,
        avgScore,
      };
    }

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats,
    };
  }

  async findOne(id: string, currentUser?: any) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            studentCode: true,
          },
        },
        assignment: {
          include: {
            problem: true,
            classroom: true,
          },
        },
        details: {
          include: {
            testCase: {
              select: {
                id: true,
                isHidden: true,
                score: true,
                input: true,
                expectedOutput: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Bài nộp với ID "${id}" không tồn tại.`);
    }

    // 🛡️ BẢO VỆ CHỐNG IDOR: Chỉ chủ sở hữu bài nộp hoặc ADMIN / LECTURER mới được xem chi tiết
    const isOwner = currentUser ? submission.userId === currentUser.id : false;
    const isAdminOrLecturer =
      currentUser?.role === 'ADMIN' || currentUser?.role === 'LECTURER';

    if (currentUser && !isOwner && !isAdminOrLecturer) {
      throw new ForbiddenException(
        'Bạn không có quyền xem chi tiết mã nguồn bài nộp của sinh viên khác!',
      );
    }

    // 🛡️ PHÂN QUYỀN HIỂN THỊ TEST CASE:
    // - Sinh viên: Ẩn input/expectedOutput của các test case ẩn (isHidden = true) để chống gian lận
    // - Admin / Giảng viên: Được xem trọn vẹn 100% tất cả test case để kiểm tra, chấm và giải đáp
    const sanitizedDetails = submission.details.map((detail) => {
      if (!isAdminOrLecturer && detail.testCase?.isHidden) {
        return {
          ...detail,
          testCase: {
            ...detail.testCase,
            input: null,
            expectedOutput: null,
          },
        };
      }
      return detail;
    });

    return {
      ...submission,
      details: sanitizedDetails,
    };
  }

  async cancel(id: string, userId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Không tìm thấy bài nộp.');
    }

    if (submission.userId !== userId) {
      throw new BadRequestException('Bạn không có quyền hủy bài nộp này.');
    }

    // Chỉ hủy khi bài nộp đang chờ hoặc đang chấm
    if (submission.status !== JudgeStatus.PENDING && submission.status !== JudgeStatus.RUNNING) {
      return {
        message: 'Bài nộp đã hoàn tất hoặc đã được hủy trước đó.',
        status: submission.status,
      };
    }

    // Cập nhật trạng thái thành CANCELLED trong DB
    const updated = await this.prisma.submission.update({
      where: { id },
      data: { status: JudgeStatus.CANCELLED },
    });

    // Thử xóa job trong queue nếu chưa chạy xong
    try {
      const jobs = await this.judgingQueue.getJobs(['waiting', 'delayed', 'active']);
      const targetJob = jobs.find((j) => j.data?.submissionId === id);
      if (targetJob) {
        await targetJob.remove();
      }
    } catch (e) {
      console.warn(`[BullMQ] Không thể xóa job từ queue: ${e.message}`);
    }

    return {
      message: 'Hủy chấm bài thành công.',
      status: updated.status,
    };
  }

  /**
   * 🤖 Lấy hoặc sinh nhận xét AI Review cho bài nộp (Có Caching qua DB cột aiFeedback)
   */
  async getOrGenerateAiReview(id: string, currentUser: any, forceRefresh = false) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        assignment: {
          include: {
            problem: true,
          },
        },
        details: {
          include: {
            testCase: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Bài nộp với ID "${id}" không tồn tại.`);
    }

    // Kiểm tra quyền
    const isOwner = currentUser ? submission.userId === currentUser.id : false;
    const isAdminOrLecturer =
      currentUser?.role === 'ADMIN' || currentUser?.role === 'LECTURER';

    if (currentUser && !isOwner && !isAdminOrLecturer) {
      throw new ForbiddenException('Bạn không có quyền xem phân tích bài nộp này!');
    }

    // 1. Nếu đã có aiFeedback trong DB và không yêu cầu forceRefresh -> Trả về cache ngay lập tức!
    if (submission.aiFeedback && !forceRefresh) {
      try {
        const parsed = JSON.parse(submission.aiFeedback);
        return {
          cached: true,
          review: parsed,
        };
      } catch (e) {
        // Nếu trước đó lưu dạng plain text thì trả về dạng object đơn giản
        return {
          cached: true,
          review: {
            summary: submission.aiFeedback,
            timeComplexity: 'N/A',
            spaceComplexity: 'N/A',
            hints: [submission.aiFeedback],
            cleanCodeTips: [],
            score: submission.totalScore * 10,
          },
        };
      }
    }

    // 2. Nếu chưa có (hoặc forceRefresh) -> Gọi Gemini AI phân tích bài làm
    const problem = submission.assignment.problem;
    const failedDetails = submission.details.filter((d) => d.status !== JudgeStatus.ACCEPTED);
    const failedSummary = failedDetails
      .slice(0, 3)
      .map(
        (d, idx) =>
          `Test #${idx + 1}: ${d.status}${d.errorMessage ? ` - Lỗi: ${d.errorMessage}` : ''}${
            d.actualOutput ? ` - Code in ra: ${d.actualOutput.substring(0, 100)}` : ''
          }`,
      )
      .join('\n');

    const prompt = `
Bạn là Trợ giảng AI chuyên ngành Khoa học Máy tính & Lập trình thuật toán.
Hãy phân tích bài nộp của sinh viên dưới đây và đưa ra nhận xét, gợi ý sư phạm:

THÔNG TIN BÀI TẬP:
- Tiêu đề: ${problem.title}
- Đề bài: ${problem.description}
- Giới hạn thời gian: ${problem.timeLimitMs} ms, Bộ nhớ: ${problem.memoryLimitMb} MB

THÔNG TIN BÀI NỘP:
- Ngôn ngữ: ${submission.language}
- Trạng thái tổng quan: ${submission.status} (Điểm: ${submission.totalScore}/10)
- Các lỗi/testcase không đạt (nếu có):
${failedSummary || 'Tất cả các test case đều ĐẠT (ACCEPTED)'}

MÃ NGUỒN CỦA SINH VIÊN:
\`\`\`${submission.language}
${submission.sourceCode}
\`\`\`

YÊU CẦU ĐẶC BIỆT:
1. KHÔNG VIẾT TOÀN BỘ CODE GIẢI (Không spoil đáp án trực tiếp). Hãy đưa ra GỢI Ý (Hint) theo tư duy giải thuật để sinh viên tự suy nghĩ.
2. Xác định độ phức tạp Thời gian (Time Complexity) và Không gian (Space Complexity) của code sinh viên (ví dụ O(N), O(NlogN), O(1)...).
3. Nêu các trường hợp biên (Edge cases / Corner cases) mà sinh viên có thể đã bỏ quên hoặc chưa xử lý tốt (ví dụ: N=0, N âm, tràn số, mảng rỗng...).
4. Gợi ý 1-2 điểm cải thiện về Clean Code / Phong cách lập trình (đặt tên biến, format, tối ưu cấu trúc).

Hãy trả về kết quả theo cấu trúc JSON sau:
{
  "summary": "Nhận xét tổng quan ngắn gọn 1-2 câu về bài làm",
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)",
  "complexityExplanation": "Giải thích ngắn vì sao lại ra độ phức tạp đó",
  "hints": ["Gợi ý 1", "Gợi ý 2"],
  "edgeCases": ["Trường hợp biên 1 cần lưu ý", "Trường hợp biên 2"],
  "cleanCodeTips": ["Mẹo viết code sạch 1", "Mẹo 2"],
  "cleanCodeScore": 85
}
`;

    const schema = {
      type: 'OBJECT',
      properties: {
        summary: { type: 'STRING' },
        timeComplexity: { type: 'STRING' },
        spaceComplexity: { type: 'STRING' },
        complexityExplanation: { type: 'STRING' },
        hints: { type: 'ARRAY', items: { type: 'STRING' } },
        edgeCases: { type: 'ARRAY', items: { type: 'STRING' } },
        cleanCodeTips: { type: 'ARRAY', items: { type: 'STRING' } },
        cleanCodeScore: { type: 'NUMBER' },
      },
      required: ['summary', 'timeComplexity', 'spaceComplexity', 'hints'],
    };

    let reviewData: any;
    try {
      reviewData = await this.aiService.generateJson(prompt, schema, 'gemini-2.5-flash');
    } catch (e) {
      console.error('Lỗi khi gọi AI Review:', e);
      reviewData = {
        summary: `Bài nộp đạt kết quả ${submission.status}. Hãy kiểm tra kỹ các vòng lặp và điều kiện biên.`,
        timeComplexity: 'N/A',
        spaceComplexity: 'N/A',
        complexityExplanation: 'Không thể tính toán tự động.',
        hints: ['Kiểm tra các trường hợp đặc biệt của bài toán.'],
        edgeCases: ['Dữ liệu đầu vào nhỏ nhất hoặc lớn nhất.'],
        cleanCodeTips: ['Giữ format code đồng nhất.'],
        cleanCodeScore: 70,
      };
    }

    // 3. LƯU VÀO DATABASE ĐỂ DÙNG LẠI CHO NHỮNG LẦN SAU (Caching)
    await this.prisma.submission.update({
      where: { id },
      data: {
        aiFeedback: JSON.stringify(reviewData),
      },
    });

    return {
      cached: false,
      review: reviewData,
    };
  }
}

