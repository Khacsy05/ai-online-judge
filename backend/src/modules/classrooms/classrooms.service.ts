import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { AssignStudentsDto } from './dto/assign-students.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role, JudgeStatus } from '@prisma/client';
import { QueryClassroomsDto } from './dto/query-classrooms.dto';

@Injectable()
export class ClassroomsService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createClassroomDto: CreateClassroomDto) {
    const { code, name } = createClassroomDto;
    if (!code || !name) {
      throw new BadRequestException('Vui lòng cung cấp đầy đủ mã lớp và tên môn học.');
    }

    const normalizedCode = code.trim().toUpperCase();
    const existing = await this.prisma.classroom.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw new BadRequestException(`Mã lớp "${normalizedCode}" đã tồn tại trên hệ thống.`);
    }

    return this.prisma.classroom.create({
      data: {
        code: normalizedCode,
        name: name.trim(),
      },
    });
  }

  findAll() {
    return this.prisma.classroom.findMany({
      include: {
        _count: {
          select: {
            members: true,
            assignments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            assignments: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                studentCode: true,
                email: true,
                role: true,
              },
            },
          },
        },
        assignments: {
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                timeLimitMs: true,
                memoryLimitMb: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundException(`Không tìm thấy lớp học với ID: "${id}"`);
    }

    return classroom;
  }

  async update(id: string, updateClassroomDto: UpdateClassroomDto) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id },
    });
    if (!classroom) {
      throw new NotFoundException(`Không tìm thấy lớp học với ID: "${id}"`);
    }

    const dataToUpdate: any = {};
    if (updateClassroomDto.name) {
      dataToUpdate.name = updateClassroomDto.name.trim();
    }
    if (updateClassroomDto.code) {
      const normalizedCode = updateClassroomDto.code.trim().toUpperCase();
      if (normalizedCode !== classroom.code) {
        const existing = await this.prisma.classroom.findUnique({
          where: { code: normalizedCode },
        });
        if (existing) {
          throw new BadRequestException(`Mã lớp "${normalizedCode}" đã tồn tại trên hệ thống.`);
        }
      }
      dataToUpdate.code = normalizedCode;
    }

    return this.prisma.classroom.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(id: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundException(`Không tìm thấy lớp học với ID: "${id}"`);
    }

    // ❌ Chặn không cho xóa nếu lớp đã có sinh viên
    if ((classroom._count?.members || 0) > 0) {
      throw new BadRequestException(
        `Không thể xóa lớp học "${classroom.name}" vì lớp đang có ${classroom._count.members} sinh viên tham gia. Vui lòng chuyển hoặc xóa sinh viên trước!`
      );
    }

    return this.prisma.classroom.delete({
      where: { id },
    });
  }

  /**
   * Phân công sinh viên vào lớp học
   */
  async assignStudents(classroomId: string, dto: AssignStudentsDto) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom) {
      throw new NotFoundException(`Không tìm thấy lớp học với ID: "${classroomId}"`);
    }

    // 1. Tập hợp danh sách User ID cần thêm
    const userIdsToAdd = new Set<string>();

    if (dto.studentId) {
      userIdsToAdd.add(dto.studentId);
    }
    if (dto.studentIds && Array.isArray(dto.studentIds)) {
      dto.studentIds.forEach((id) => userIdsToAdd.add(id));
    }

    // 2. Nếu truyền studentCodes, tìm User ID tương ứng
    if (dto.studentCodes && Array.isArray(dto.studentCodes) && dto.studentCodes.length > 0) {
      const usersByCode = await this.prisma.user.findMany({
        where: {
          studentCode: { in: dto.studentCodes },
          role: Role.STUDENT,
        },
        select: { id: true },
      });
      usersByCode.forEach((u) => userIdsToAdd.add(u.id));
    }

    if (userIdsToAdd.size === 0) {
      throw new BadRequestException('Vui lòng cung cấp ít nhất một mã sinh viên (studentCode) hoặc ID sinh viên (studentId).');
    }

    // 3. Lấy danh sách thành viên ĐÃ CÓ LỚP trong toàn hệ thống (ở lớp này hoặc lớp khác)
    const existingMembers = await this.prisma.classroomMember.findMany({
      where: {
        userId: { in: Array.from(userIdsToAdd) },
      },
      include: {
        classroom: {
          select: { name: true, code: true },
        },
        user: {
          select: { fullName: true, studentCode: true },
        },
      },
    });

    // Nếu có sinh viên đã thuộc lớp khác, thông báo cụ thể
    const inOtherClass = existingMembers.filter((m) => m.classroomId !== classroomId);
    if (inOtherClass.length > 0) {
      const names = inOtherClass
        .map((m) => `${m.user.fullName} (${m.user.studentCode || 'MSSV'}) đang ở lớp "${m.classroom.name}"`)
        .join(', ');
      throw new BadRequestException(
        `Không thể thêm! Các sinh viên sau đã có lớp học khác: ${names}. Mỗi sinh viên chỉ được tham gia 1 lớp học!`
      );
    }

    const inThisClassUserIds = new Set(
      existingMembers.filter((m) => m.classroomId === classroomId).map((m) => m.userId)
    );

    // Lọc ra các sinh viên thực sự chưa có trong lớp này
    const newMembersData = Array.from(userIdsToAdd)
      .filter((uid) => !inThisClassUserIds.has(uid))
      .map((uid) => ({
        classroomId,
        userId: uid,
      }));

    if (newMembersData.length === 0) {
      return {
        message: 'Tất cả sinh viên được chỉ định đã có sẵn trong lớp học này.',
        addedCount: 0,
      };
    }

    // 4. Thêm hàng loạt vào ClassroomMember
    await this.prisma.classroomMember.createMany({
      data: newMembersData,
      skipDuplicates: true,
    });

    return {
      message: `Đã phân công thành công ${newMembersData.length} sinh viên vào lớp "${classroom.name}".`,
      addedCount: newMembersData.length,
      alreadyExistedCount: inThisClassUserIds.size,
    };
  }

  /**
   * Xóa một sinh viên khỏi lớp học
   */
  async removeStudentFromClass(classroomId: string, userId: string) {
    const member = await this.prisma.classroomMember.findUnique({
      where: {
        userId_classroomId: {
          userId,
          classroomId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Sinh viên này không thuộc lớp học được chỉ định.');
    }

    await this.prisma.classroomMember.delete({
      where: {
        userId_classroomId: {
          userId,
          classroomId,
        },
      },
    });

    return {
      message: 'Đã xóa sinh viên khỏi lớp học thành công.',
    };
  }

  /**
   * Xóa nhiều sinh viên khỏi lớp học cùng lúc
   */
  async removeStudentsFromClass(classroomId: string, userIds: string[]) {
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new BadRequestException('Vui lòng cung cấp danh sách sinh viên cần xóa.');
    }

    const res = await this.prisma.classroomMember.deleteMany({
      where: {
        classroomId,
        userId: { in: userIds },
      },
    });

    return {
      message: `Đã xóa thành công ${res.count} sinh viên khỏi lớp học.`,
      deletedCount: res.count,
    };
  }

  /**
   * Lấy danh sách các sinh viên CHƯA tham gia vào BẤT KỲ lớp học nào
   * (Để hiển thị checkbox chọn thêm vào lớp)
   */
  async getAvailableStudents(classroomId: string, search?: string) {
    // 1. Lấy danh sách tất cả sinh viên ĐÃ CÓ LỚP trong toàn hệ thống
    const allEnrolledMembers = await this.prisma.classroomMember.findMany({
      select: { userId: true },
    });
    const enrolledUserIds = allEnrolledMembers.map((m) => m.userId);

    // 2. Chỉ tìm những sinh viên CHƯA THUỘC BẤT KỲ LỚP NÀO
    const whereCondition: any = {
      role: Role.STUDENT,
      id: { notIn: enrolledUserIds },
    };

    if (search && search.trim()) {
      const q = search.trim();
      whereCondition.OR = [
        { fullName: { contains: q } },
        { studentCode: { contains: q } },
        { email: { contains: q } },
      ];
    }

    return this.prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        fullName: true,
        studentCode: true,
        email: true,
      },
      orderBy: [
        { studentCode: 'asc' },
        { fullName: 'asc' },
      ],
      take: 100, // Lấy tối đa 100 SV mỗi lần để tối ưu tốc độ
    });
  }

  async getClassroomLeaderboard(classroomId: string, query: QueryClassroomsDto) {
    const { page, limit } = query
    const pageNumber = Math.max(1, Number(page) || 1)
    const limitNumber = Math.max(1, Number(limit) || 6)
    const skip = (pageNumber - 1) * limitNumber
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

    // Gán thứ hạng rank chuẩn cho toàn bộ học sinh trước khi phân trang
    const rankedLeaderboard = leaderboard.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

    // Tìm kiếm theo tên, mã sinh viên hoặc email nếu có query.search
    let filteredLeaderboard = rankedLeaderboard;
    if (query?.search && query.search.trim()) {
      const keyword = query.search.trim().toLowerCase();
      filteredLeaderboard = rankedLeaderboard.filter(
        (item) =>
          item.fullName.toLowerCase().includes(keyword) ||
          item.studentCode.toLowerCase().includes(keyword) ||
          item.email.toLowerCase().includes(keyword),
      );
    }

    const topStudent = rankedLeaderboard.length > 0 ? {
      userId: rankedLeaderboard[0].userId,
      fullName: rankedLeaderboard[0].fullName,
      studentCode: rankedLeaderboard[0].studentCode,
      email: rankedLeaderboard[0].email,
      totalScore: rankedLeaderboard[0].totalScore,
    } : null;

    const total = filteredLeaderboard.length;
    const totalPages = Math.ceil(total / limitNumber) || 1;
    const paginatedLeaderboard = filteredLeaderboard.slice(skip, skip + limitNumber);

    return {
      classroomId,
      classroomCode: classroom.code,
      classroomName: classroom.name,
      totalAssignments: assignments.length,
      maxClassScore,
      topStudent,
      studentCount: members.length,
      leaderboard: paginatedLeaderboard,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
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
        latestSubmissionId: subs[0]?.id || null,
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
