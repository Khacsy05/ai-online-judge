import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService) {
    super({
      // 1. Tự động bóc tách Token từ Header "Authorization: Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // 2. Không chấp nhận các token đã hết hạn
      ignoreExpiration: false,

      // 3. Khóa bí mật dùng để giải mã và xác thực chữ ký của Token
      // ⚠️ Lưu ý: Thay chuỗi này bằng chuỗi Secret Key thực tế mà bạn dùng khi tạo Token lúc Login
      secretOrKey: process.env.JWT_ACCESS_SECRET || "ACCESS_SECRET_KEY",
    });
  }

  /**
   * Hàm này sẽ TỰ ĐỘNG CHẠY ngay sau khi Passport đã verify Token thành công.
   * @param payload Dữ liệu đã được giải mã từ bên trong Token (chứa id, email, role_id...)
   */
  async validate(payload: any) {
    if (!payload) {
      throw new UnauthorizedException('Token không hợp lệ!');
    }

    // Kiểm tra trực tiếp trạng thái kích hoạt của người dùng trong DB
    const user = await this.prisma.user.findUnique({
      where: { id: payload.id }
    });

    if (!user) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa hoặc không tồn tại!');
    }

    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,

    };
  }
}