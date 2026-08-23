import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('judging') private readonly judgingQueue: Queue,
  ) { }

  async create(file: Express.Multer.File, userId: string, assignmentId: string) {
    // 1. Detect file extension and map to programming language
    const filename = file.originalname;
    const parts = filename.split('.');
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

  async findAll(userId?: string, assignmentId?: string) {
    return this.prisma.submission.findMany({
      where: {
        userId: userId || undefined,
        assignmentId: assignmentId || undefined,
      },
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
    });
  }

  async findOne(id: string) {
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
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Bài nộp với ID "${id}" không tồn tại.`);
    }

    return submission;
  }
}
