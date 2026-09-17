import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo tài khoản người dùng mới
   */
  async create(createUserDto: CreateUserDto) {
    const { email, password, fullName, studentCode, role, classroomId } = createUserDto;

    // 1. Kiểm tra trùng Email
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingEmail) {
      throw new ConflictException('Email này đã được sử dụng bởi một tài khoản khác!');
    }

    // 2. Kiểm tra trùng StudentCode nếu có
    if (studentCode?.trim()) {
      const existingCode = await this.prisma.user.findUnique({
        where: { studentCode: studentCode.trim() },
      });
      if (existingCode) {
        throw new ConflictException('Mã sinh viên này đã tồn tại trong hệ thống!');
      }
    }

    // 3. Hash mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Tạo User và gán vào lớp học nếu có classroomId
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        fullName: fullName.trim(),
        studentCode: studentCode?.trim() || null,
        role: role || 'STUDENT',
        ...(classroomId && {
          classrooms: {
            create: {
              classroomId,
            },
          },
        }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        studentCode: true,
        role: true,
        createdAt: true,
        classrooms: {
          include: {
            classroom: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });

    return {
      message: 'Tạo tài khoản người dùng thành công!',
      data: user,
    };
  }

  /**
   * Lấy danh sách tài khoản kèm phân trang, tìm kiếm và lọc theo Role / Lớp học
   */
  async findAll(query: QueryUsersDto) {
    const { search, role, classroomId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { fullName: { contains: term } },
        { email: { contains: term } },
        { studentCode: { contains: term } },
      ];
    }

    if (classroomId) {
      where.classrooms = {
        some: {
          classroomId,
        },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          studentCode: true,
          role: true,
          createdAt: true,
          classrooms: {
            include: {
              classroom: {
                select: { id: true, code: true, name: true },
              },
            },
          },
          _count: {
            select: {
              submissions: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Lấy thông tin chi tiết 1 tài khoản
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        studentCode: true,
        role: true,
        createdAt: true,
        classrooms: {
          include: {
            classroom: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        _count: {
          select: {
            submissions: true,
            createdProblems: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng!');
    }

    return user;
  }

  /**
   * Cập nhật thông tin tài khoản
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng cần cập nhật!');
    }

    const { email, fullName, studentCode, role, classroomId } = updateUserDto;

    // Kiểm tra email nếu thay đổi
    if (email && email.toLowerCase().trim() !== user.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException('Email này đã được sử dụng bởi một tài khoản khác!');
      }
    }

    // Kiểm tra mã sinh viên nếu thay đổi
    if (studentCode !== undefined && studentCode?.trim() !== user.studentCode) {
      if (studentCode?.trim()) {
        const existingCode = await this.prisma.user.findUnique({
          where: { studentCode: studentCode.trim() },
        });
        if (existingCode && existingCode.id !== id) {
          throw new ConflictException('Mã sinh viên này đã thuộc về người khác!');
        }
      }
    }

    const data: any = {};
    if (email) data.email = email.toLowerCase().trim();
    if (fullName) data.fullName = fullName.trim();
    if (studentCode !== undefined) data.studentCode = studentCode?.trim() || null;
    if (role) data.role = role;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        studentCode: true,
        role: true,
        createdAt: true,
        classrooms: {
          include: {
            classroom: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });

    // Nếu có classroomId mới được chỉ định thêm vào lớp
    if (classroomId) {
      const alreadyMember = await this.prisma.classroomMember.findUnique({
        where: {
          userId_classroomId: {
            classroomId,
            userId: id,
          },
        },
      });
      if (!alreadyMember) {
        await this.prisma.classroomMember.create({
          data: { classroomId, userId: id },
        });
      }
    }

    return {
      message: 'Cập nhật tài khoản thành công!',
      data: updatedUser,
    };
  }

  /**
   * Xóa tài khoản người dùng
   */
  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng để xóa!');
    }

    // Xóa liên kết lớp học trước
    await this.prisma.classroomMember.deleteMany({
      where: { userId: id },
    });

    // Xóa người dùng
    await this.prisma.user.delete({
      where: { id },
    });

    return {
      message: `Đã xóa tài khoản "${user.fullName}" (${user.email}) thành công!`,
    };
  }
}
