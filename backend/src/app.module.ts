import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { BullModule } from '@nestjs/bullmq';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClassroomsModule } from './modules/classrooms/classrooms.module';
import { AdminModule } from './modules/admin/admin.module';
import { ProblemsModule } from './modules/problems/problems.module';
import { UsersModule } from './modules/users/users.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
@Module({
  imports: [
    PrismaModule,
    AssignmentsModule,
    SubmissionsModule,
    AiModule,
    AuthModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        tls: process.env.REDIS_TLS === 'true' || (process.env.REDIS_HOST && !['localhost', '127.0.0.1'].includes(process.env.REDIS_HOST)) ? {} : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        keepAlive: 10000,
        retryStrategy(times) {
          return Math.min(times * 100, 3000);
        },
        reconnectOnError(err) {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        },
      },
    }),
    ClassroomsModule,
    AdminModule,
    ProblemsModule,
    UsersModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 giây
        limit: 10, // tối đa 10 requests / 1s từ cùng 1 IP (chuẩn bảo vệ)
      },
      {
        name: 'medium',
        ttl: 60000, // 1 phút
        limit: 100, // tối đa 100 requests / 1 phút
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
