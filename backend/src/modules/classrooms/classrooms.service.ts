import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role, JudgeStatus } from '@prisma/client';

@Injectable()
export class ClassroomsService {
  constructor(private readonly prisma: PrismaService) {}

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

      return {
        userId: student.id,
        fullName: student.fullName,
        studentCode: student.studentCode || '',
        email: student.email,
        totalScore: Math.round(totalScore * 100) / 100,
        solvedCount: uniqueSolvedAssignments.size,
        scores: scores
      };
    });

    // Sort: totalScore desc, solvedCount desc
    leaderboard.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return b.solvedCount - a.solvedCount;
    });

    return leaderboard.map((item, index) => ({
      rank: index + 1,
      ...item
    }));
  }
}
