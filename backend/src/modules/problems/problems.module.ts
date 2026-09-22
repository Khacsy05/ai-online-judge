import { Module } from '@nestjs/common';
import { ProblemsService } from './problems.service';
import { ProblemsController } from './problems.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { SubmissionsModule } from '../submissions/submissions.module';

@Module({
  imports: [PrismaModule, AiModule, SubmissionsModule],
  controllers: [ProblemsController],
  providers: [ProblemsService],
})
export class ProblemsModule {}

