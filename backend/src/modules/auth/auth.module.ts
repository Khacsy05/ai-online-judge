import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtStrategy } from './jwt.strategy';
@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
 providers: [
    AuthService, 
    JwtStrategy
  ],
})
export class AuthModule {}
