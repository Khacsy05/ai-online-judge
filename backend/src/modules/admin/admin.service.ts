import { Injectable } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role, JudgeStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) { }

  async getStats() {
    const [
      totalClassrooms,
      totalProblems,
      totalStudents,
      totalAdmins,
      totalSubmissions,
      acceptedSubmissions,
    ] = await Promise.all([
      this.prisma.classroom.count(),
      this.prisma.problem.count(),
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.submission.count({ where: { status: { not: JudgeStatus.CANCELLED } } }),
      this.prisma.submission.count({ where: { status: JudgeStatus.ACCEPTED } }),
    ]);

    const acceptanceRate = totalSubmissions > 0
      ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
      : 0;

    return {
      totalClassrooms,
      totalProblems,
      totalStudents,
      totalAdmins,
      totalSubmissions,
      acceptedSubmissions,
      acceptanceRate,
    };
  }

  create(createAdminDto: CreateAdminDto) {
    return 'This action adds a new admin';
  }

  findAll() {
    return `This action returns all admin`;
  }

  findOne(id: number) {
    return `This action returns a #${id} admin`;
  }

  update(id: number, updateAdminDto: UpdateAdminDto) {
    return `This action updates a #${id} admin`;
  }

  remove(id: number) {
    return `This action removes a #${id} admin`;
  }
}

