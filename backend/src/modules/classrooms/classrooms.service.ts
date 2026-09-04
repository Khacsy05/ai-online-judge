import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role, JudgeStatus } from '@prisma/client';

@Injectable()
export class ClassroomsService {
  constructor(private readonly prisma: PrismaService) { }

  create(createClassroomDto: CreateClassroomDto) {
    return 'This action adds a new classroom';
  }

  findAll() {
    return this.prisma.classroom.findMany();
  }

  findOne(id: string) {
    return this.prisma.classroom.findUnique({
      where: { id },
    });
  }

  update(id: string, updateClassroomDto: UpdateClassroomDto) {
    return `This action updates a #${id} classroom`;
  }

  remove(id: string) {
    return this.prisma.classroom.delete({
      where: { id },
    });
  }

  async getClassroomLeaderboard(classroomId: string) {
    // Check if classroom exists
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom) {
      throw new NotFoundException(`Classroom with ID "${classroomId}" not found`);
    }

    // 1. Get all students in the classroom
    const members = await this.prisma.classroomMember.findMany({
      where: {
        classroomId: classroomId,
        user: { role: Role.STUDENT }
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            studentCode: true,
            email: true
          }
        }
      }
    });

    // 2. Get all assignments in the classroom
    const assignments = await this.prisma.assignment.findMany({
      where: { classroomId: classroomId },
      select: {
        id: true,
        problem: {
          select: {
            title: true
          }
        }
      }
    });

    const assignmentIds = assignments.map(a => a.id);

    // 3. Get all submissions for these assignments by the classroom's students
    const submissions = await this.prisma.submission.findMany({
      where: {
        assignmentId: { in: assignmentIds },
        status: { not: JudgeStatus.CANCELLED }
      },
      select: {
        userId: true,
        assignmentId: true,
        totalScore: true,
        status: true
      }
    });

    // Aggregations
    const studentScoresMap: Record<string, Record<string, number>> = {};

    for (const sub of submissions) {
      if (!studentScoresMap[sub.userId]) {
        studentScoresMap[sub.userId] = {};
      }

      const currentScore = studentScoresMap[sub.userId][sub.assignmentId] || 0;
      if (sub.totalScore > currentScore) {
        studentScoresMap[sub.userId][sub.assignmentId] = sub.totalScore;
      }
    }

    const maxClassScore = assignments.length * 10;

    const leaderboard = members.map(member => {
      const student = member.user;
      const scores = studentScoresMap[student.id] || {};

      let totalScore = 0;
      assignments.forEach(assign => {
        totalScore += scores[assign.id] || 0;
      });

      // Count unique solved assignments (status: ACCEPTED)
      const studentSubs = submissions.filter(s => s.userId === student.id);
      const uniqueSolvedAssignments = new Set(
        studentSubs.filter(s => s.status === JudgeStatus.ACCEPTED).map(s => s.assignmentId)
      );

      const roundedScore = Math.round(totalScore * 100) / 100;
      const progressPercentage = maxClassScore > 0
        ? Math.round((roundedScore / maxClassScore) * 10000) / 100
        : 0;

      return {
        userId: student.id,
        fullName: student.fullName,
        studentCode: student.studentCode || '',
        email: student.email,
        totalScore: roundedScore,
        maxClassScore,
        progressPercentage,
        solvedCount: uniqueSolvedAssignments.size,
        scores: scores,
      };
    });

    // Sort: totalScore desc, solvedCount desc
    leaderboard.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return b.solvedCount - a.solvedCount;
    });

    return {
      classroomId,
      classroomCode: classroom.code,
      classroomName: classroom.name,
      totalAssignments: assignments.length,
      maxClassScore,
      leaderboard: leaderboard.map((item, index) => ({
        rank: index + 1,
        ...item,
      })),
    };
  }

  async getMyClassroomProgress(classroomId: string, userId: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        assignments: {
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                description: true,
                timeLimitMs: true,
                memoryLimitMb: true,
                testCases: {
                  where: { isHidden: false },
                  select: {
                    id: true,
                    input: true,
                    expectedOutput: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundException(`Classroom with ID "${classroomId}" not found`);
    }

    // Kiểm tra xem sinh viên có phải là thành viên trong lớp này không
    const isMember = await this.prisma.classroomMember.findUnique({
      where: {
        userId_classroomId: {
          userId,
          classroomId,
        },
      },
    });

    if (!isMember) {
      throw new ForbiddenException('Bạn không phải là sinh viên của lớp học này.');
    }

    const assignments = classroom.assignments;
    const totalAssignments = assignments.length;
    const maxClassScore = totalAssignments * 10;
    const assignmentIds = assignments.map(a => a.id);

    // Lấy tất cả bài nộp của sinh viên này trong lớp
    const submissions = await this.prisma.submission.findMany({
      where: {
        userId,
        assignmentId: { in: assignmentIds },
        status: { not: JudgeStatus.CANCELLED },
      },
      select: {
        id: true,
        assignmentId: true,
        totalScore: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Tính điểm và trạng thái chi tiết của từng bài tập
    const assignmentProgress = assignments.map(assign => {
      const subs = submissions.filter(s => s.assignmentId === assign.id);
      const attemptCount = subs.length;
      let bestScore = 0;
      let latestScore = 0;
      let isSolved = false;
      let latestStatus: string = 'NOT_SUBMITTED';

      if (subs.length > 0) {
        latestStatus = subs[0].status;
        latestScore = subs[0].totalScore;
        bestScore = Math.max(...subs.map(s => s.totalScore));
        isSolved = subs.some(s => s.status === JudgeStatus.ACCEPTED) || bestScore >= 10.0;
      }

      return {
        assignmentId: assign.id,
        problemId: assign.problemId,
        problemTitle: assign.problem.title,
        problemDescription: assign.problem.description,
        timeLimitMs: assign.problem.timeLimitMs,
        memoryLimitMb: assign.problem.memoryLimitMb,
        testCases: assign.problem.testCases,
        startTime: assign.startTime,
        deadline: assign.deadline,
        attemptCount,
        bestScore,
        latestScore,
        maxPossibleScore: 10.0,
        isSolved,
        latestStatus,
      };
    });

    let studentTotalScore = 0;
    let solvedCount = 0;

    assignmentProgress.forEach(item => {
      studentTotalScore += item.bestScore;
      if (item.isSolved) {
        solvedCount++;
      }
    });

    const roundedTotalScore = Math.round(studentTotalScore * 100) / 100;
    const progressPercentage = maxClassScore > 0
      ? Math.round((roundedTotalScore / maxClassScore) * 10000) / 100
      : 0;

    return {
      classroomId,
      classroomCode: classroom.code,
      classroomName: classroom.name,
      studentTotalScore: roundedTotalScore,
      maxClassScore,
      totalAssignments,
      solvedCount,
      progressPercentage,
      assignments: assignmentProgress,
    };
  }
}
