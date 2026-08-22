import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createAssignmentDto: CreateAssignmentDto) {
    const { classroomId, problemId, startTime, deadline, isPublished } = createAssignmentDto;

    // Check if classroom exists
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom) {
      throw new NotFoundException(`Classroom with ID "${classroomId}" not found`);
    }

    // Check if problem exists
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
    });
    if (!problem) {
      throw new NotFoundException(`Problem with ID "${problemId}" not found`);
    }

    // Check if classroom already has this problem assigned
    const existingAssignment = await this.prisma.assignment.findUnique({
      where: {
        classroomId_problemId: {
          classroomId,
          problemId,
        },
      },
    });
    if (existingAssignment) {
      throw new BadRequestException('Lớp học này đã được giao bài tập này rồi.');
    }

    return this.prisma.assignment.create({
      data: {
        classroomId,
        problemId,
        startTime: new Date(startTime),
        deadline: new Date(deadline),
        isPublished: isPublished ?? true,
      },
    });
  }

  async findAll(classroomId?: string) {
    return this.prisma.assignment.findMany({
      where: classroomId ? { classroomId } : undefined,
      include: {
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
            description: true,
            timeLimitMs: true,
            memoryLimitMb: true,
          },
        },
        _count: {
          select: { submissions: true }, // Trả về { _count: { submissions: 10 } }
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        classroom: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        problem: {
          include: {
            testCases: {
              where: {
                isHidden: false, // only expose public test cases
              },
              select: {
                id: true,
                input: true,
                expectedOutput: true,
                isHidden: true,
                score: true,
              },
            },
          },
        },
        _count: {
          select: { submissions: true }, // Trả về { _count: { submissions: 10 } }
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID "${id}" not found`);
    }

    return assignment;
  }

  async update(id: string, updateAssignmentDto: UpdateAssignmentDto) {
    const assignment = await this.findOne(id);

    const { startTime, deadline, classroomId, problemId, isPublished } = updateAssignmentDto;

    // Check relations if they are being updated
    if (classroomId) {
      const classroom = await this.prisma.classroom.findUnique({ where: { id: classroomId } });
      if (!classroom) throw new NotFoundException(`Classroom with ID "${classroomId}" not found`);
    }

    if (problemId) {
      const problem = await this.prisma.problem.findUnique({ where: { id: problemId } });
      if (!problem) throw new NotFoundException(`Problem with ID "${problemId}" not found`);
    }

    // Determine the target classroom and problem for the update
    const targetClassroomId = classroomId ?? assignment.classroomId;
    const targetProblemId = problemId ?? assignment.problemId;

    // Check if the target classroom already has this problem assigned
    if (targetClassroomId !== assignment.classroomId || targetProblemId !== assignment.problemId) {
      const existingAssignment = await this.prisma.assignment.findUnique({
        where: {
          classroomId_problemId: {
            classroomId: targetClassroomId,
            problemId: targetProblemId,
          },
        },
      });

      if (existingAssignment) {
        throw new BadRequestException('Lớp học này đã được giao bài tập này rồi.');
      }
    }

    if (assignment._count.submissions > 0) {
      if (classroomId || problemId) {
        throw new BadRequestException(`Assignment with ID "${id}" has submissions`);
      }
    }

    return this.prisma.assignment.update({
      where: { id },
      data: {
        classroomId,
        problemId,
        isPublished,
        startTime: startTime ? new Date(startTime) : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.assignment.delete({
      where: { id },
    });
  }
}
