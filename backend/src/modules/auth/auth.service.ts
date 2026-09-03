import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken"
import * as Express from 'express';
import { UpdatePasswordDto } from './dto/updatePass.dto';
@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService) { }

    async login(loginDto: LoginDto, response: Express.Response) {
        const { email, password } = loginDto;
        const user = await this.prisma.user.findUnique({
            where: { email: email },
            include: {
                classrooms: {
                    include: {
                        classroom: {
                            select: { id: true, code: true, name: true }
                        }
                    }
                }
            }
        });
        if (!user) {
            throw new UnauthorizedException('Email hoặc mật khẩu không chính xác!');
        }

        // 3. So sánh mật khẩu
        const isPasswordMatched = await bcrypt.compare(password, user.password);
        if (!isPasswordMatched) {
            throw new UnauthorizedException('Email hoặc mật khẩu không chính xác!');
        }

        const primaryClassroomId = user.classrooms?.[0]?.classroomId || null;
        const classrooms = user.classrooms?.map(c => c.classroom) || [];

        const accessToken = jwt.sign(
            {
                id: user.id,
                name: user.fullName,
                email: user.email,
                role: user.role,
                classroomId: primaryClassroomId,
            },
            process.env.JWT_ACCESS_SECRET || "ACCESS_SECRET_KEY",
            { expiresIn: "15m" }
        );

        const refreshToken = jwt.sign(
            {
                id: user.id,
                name: user.fullName,
                email: user.email,
                role: user.role,
                classroomId: primaryClassroomId,
            },
            process.env.JWT_REFRESH_SECRET || "REFRESH_SECRET_KEY",
            { expiresIn: "7d" }
        );

        response.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
        });

        // 4. Nếu khớp hoàn toàn, trả về thông tin user (kèm lớp học)
        return {
            message: 'Đăng nhập thành công',
            accessToken,
            user: {
                id: user.id,
                name: user.fullName,
                email: user.email,
                role: user.role,
                classroomId: primaryClassroomId,
                classrooms,
            },
        };
    }
    async refreshTokens(request: Express.Request, response: Express.Response) {
        const refreshToken = request.cookies?.['refreshToken'];
        try {
            const payload = jwt.verify(
                refreshToken,
                process.env.JWT_REFRESH_SECRET || 'REFRESH_SECRET_KEY'
            ) as any;

            const user = await this.prisma.user.findUnique({
                where: { id: payload.id },
                include: {
                    classrooms: {
                        include: {
                            classroom: {
                                select: { id: true, code: true, name: true }
                            }
                        }
                    }
                }
            });

            if (!user) {
                throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa hoặc không tồn tại');
            }

            const primaryClassroomId = user.classrooms?.[0]?.classroomId || null;
            const classrooms = user.classrooms?.map(c => c.classroom) || [];

            // 💡 Tạo cặp Token mới kèm classroomId
            const newAccessToken = jwt.sign(
                {
                    id: user.id,
                    name: user.fullName,
                    email: user.email,
                    role: user.role,
                    classroomId: primaryClassroomId,
                },
                process.env.JWT_ACCESS_SECRET || 'ACCESS_SECRET_KEY',
                { expiresIn: '15m' }
            );

            const newRefreshToken = jwt.sign(
                {
                    id: user.id,
                    name: user.fullName,
                    email: user.email,
                    role: user.role,
                    classroomId: primaryClassroomId,
                },
                process.env.JWT_REFRESH_SECRET || 'REFRESH_SECRET_KEY',
                { expiresIn: '7d' }
            );

            response.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/',
            });

            return {
                message: 'Làm mới Token thành công',
                accessToken: newAccessToken,
                user: {
                    id: user.id,
                    name: user.fullName,
                    email: user.email,
                    role: user.role,
                    classroomId: primaryClassroomId,
                    classrooms,
                },
            };
        } catch (error) {
            // ❌ Nếu token bị sai chữ ký hoặc HẾT HẠN (expired), jwt.verify sẽ văng lỗi vào đây
            throw new UnauthorizedException('Refresh Token không hợp lệ hoặc đã hết hạn');
        }
    }
    async updatePassword(updatePasswordDto: UpdatePasswordDto) {
        const { email, oldPassword, newPassword, confirmPassword } = updatePasswordDto;
        if (newPassword !== confirmPassword) {
            throw new UnauthorizedException('Mật khẩu không khớp');
        }
        const user = await this.prisma.user.findUnique({
            where: { email: email },
        })
        if (!user) {
            throw new UnauthorizedException('Email không tồn tại');
        }
        const isPasswordMatched = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordMatched) {
            throw new UnauthorizedException('Mật khẩu cũ không chính xác');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { email: email },
            data: {
                password: hashedPassword,
            },
        })
        return {
            message: 'Cập nhật mật khẩu thành công',
        }
    }
}
