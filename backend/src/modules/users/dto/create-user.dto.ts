import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có tối thiểu 6 ký tự' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  fullName: string;

  @IsOptional()
  @IsString()
  studentCode?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Vai trò phải là STUDENT hoặc ADMIN' })
  role?: Role = Role.STUDENT;

  @IsOptional()
  @IsString()
  classroomId?: string; // Tùy chọn gán ngay vào 1 lớp học
}
