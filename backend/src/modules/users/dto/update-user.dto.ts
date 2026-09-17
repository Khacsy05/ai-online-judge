import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  studentCode?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Vai trò phải là STUDENT hoặc ADMIN' })
  role?: Role;

  @IsOptional()
  @IsString()
  classroomId?: string;
}
