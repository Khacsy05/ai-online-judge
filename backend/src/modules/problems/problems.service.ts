import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { QueryProblemsDto } from './dto/query-problems.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProblemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProblemDto: CreateProblemDto) {
    const { title, description, timeLimitMs, memoryLimitMb, authorId, testCases } = createProblemDto;
    
    // Nếu chưa có authorId truyền vào, lấy user admin đầu tiên trong DB
    let finalAuthorId = authorId;
    if (!finalAuthorId) {
      const defaultUser = await this.prisma.user.findFirst();
      if (!defaultUser) {
        throw new NotFoundException('Không tìm thấy người dùng nào trong hệ thống để gán tác giả.');
      }
      finalAuthorId = defaultUser.id;
    }

    return this.prisma.problem.create({
      data: {
        title: title.trim(),
        description: description?.trim() || '',
        timeLimitMs: Number(timeLimitMs) || 1000,
        memoryLimitMb: Number(memoryLimitMb) || 256,
        authorId: finalAuthorId,
        testCases: testCases && testCases.length > 0 ? {
          create: testCases.map((tc) => ({
            input: tc.input || '',
            expectedOutput: tc.expectedOutput || '',
            isHidden: tc.isHidden !== undefined ? tc.isHidden : true,
          })),
        } : undefined,
      },
      include: {
        testCases: true,
        author: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  async findAll(query?: QueryProblemsDto) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 8;
    const search = query?.search?.trim();

    const whereCondition: any = {};
    if (search) {
      whereCondition.title = { contains: search };
    }

    const [items, total] = await Promise.all([
      this.prisma.problem.findMany({
        where: whereCondition,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              testCases: true,
              assignments: true,
            },
          },
          author: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.problem.count({
        where: whereCondition,
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id },
      include: {
        testCases: true,
        author: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!problem) {
      throw new NotFoundException(`Không tìm thấy bài tập với ID: "${id}"`);
    }

    return problem;
  }

  async update(id: string, updateProblemDto: UpdateProblemDto) {
    const problem = await this.prisma.problem.findUnique({ where: { id } });
    if (!problem) {
      throw new NotFoundException(`Không tìm thấy bài tập với ID: "${id}"`);
    }

    const { title, description, timeLimitMs, memoryLimitMb, testCases } = updateProblemDto;

    return this.prisma.$transaction(async (tx) => {
      // Nếu có danh sách testCases mới, thay thế toàn bộ testCases cũ
      if (testCases) {
        await tx.testCase.deleteMany({
          where: { problemId: id },
        });

        if (testCases.length > 0) {
          await tx.testCase.createMany({
            data: testCases.map((tc) => ({
              problemId: id,
              input: tc.input || '',
              expectedOutput: tc.expectedOutput || '',
              isHidden: tc.isHidden !== undefined ? tc.isHidden : true,
            })),
          });
        }
      }

      return tx.problem.update({
        where: { id },
        data: {
          title: title !== undefined ? title.trim() : undefined,
          description: description !== undefined ? description.trim() : undefined,
          timeLimitMs: timeLimitMs !== undefined ? Number(timeLimitMs) : undefined,
          memoryLimitMb: memoryLimitMb !== undefined ? Number(memoryLimitMb) : undefined,
        },
        include: {
          testCases: true,
          author: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });
    });
  }

  async remove(id: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    if (!problem) {
      throw new NotFoundException(`Không tìm thấy bài tập với ID: "${id}"`);
    }

    return this.prisma.problem.delete({
      where: { id },
    });
  }
}

