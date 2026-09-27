import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken"
import * as Express from 'express';
import { UpdatePasswordDto } from './dto/updatePass.dto';
import Redis from 'ioredis';
@Injectable()
export class AuthService {
    private redis: Redis;
    constructor(private prisma: PrismaService) {
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
        });
    }

    async login(loginDto: LoginDto, response: Express.Response) {
        const { email, password } = loginDto;

        const lockKey = `login_lock:${email}`;
        const isLocked = await this.redis.get(lockKey);
        if (isLocked) {
            const ttl = await this.redis.ttl(lockKey); // Số giây còn lại
            const minutesLeft = Math.ceil(ttl / 60);
            throw new UnauthorizedException(
                `Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau ${minutesLeft} phút.`
            );
        }
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
            const attemptsKey = `login_attempts:${email}`;
            const attempts = await this.redis.incr(attemptsKey);

            // Giữ bộ đếm này trong 15 phút (sau 15 phút không nhập sai nữa thì tự hủy)
            if (attempts === 1) {
                await this.redis.expire(attemptsKey, 15 * 60);
            }

            const MAX_ATTEMPTS = 5;
            if (attempts >= MAX_ATTEMPTS) {
                // Đã sai đủ 5 lần -> KHÓA TÀI KHOẢN TRONG 5 PHÚT (300 giây)
                await this.redis.set(lockKey, 'locked', 'EX', 5 * 60);
                await this.redis.del(attemptsKey);

                throw new UnauthorizedException(
                    'Bạn đã nhập sai mật khẩu 5 lần liên tiếp. Tài khoản bị tạm khóa trong 5 phút!'
                );
            } else {
                const remaining = MAX_ATTEMPTS - attempts;
                throw new UnauthorizedException(
                    `Email hoặc mật khẩu không chính xác! Bạn còn ${remaining} lần thử trước khi tài khoản bị khóa tạm thời.`
                );
            }
        }

        // ✅ NẾU NHẬP ĐÚNG MẬT KHẨU: Xóa bỏ bộ đếm số lần sai trong Redis
        await this.redis.del(`login_attempts:${email}`);

        const primaryClassroomId = user.classrooms?.[0]?.classroomId || null;
        const classrooms = user.classrooms?.map(c => c.classroom) || [];

        const accessToken = jwt.sign(
            {
                id: user.id,
                name: user.fullName,
                email: user.email,
                role: user.role,
                studentCode: user.studentCode,
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
                studentCode: user.studentCode,
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
                studentCode: user.studentCode,
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
                    studentCode: user.studentCode,
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
                    studentCode: user.studentCode,
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
                    studentCode: user.studentCode,
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
