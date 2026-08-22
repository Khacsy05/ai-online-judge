import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';

@Module({
  imports: [PrismaModule, AssignmentsModule, SubmissionsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
