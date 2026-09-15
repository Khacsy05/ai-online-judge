import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { SubmissionsProcessor } from './submissions.processor';
import { AiModule } from '../ai/ai.module';
import { SubmissionsGateway } from './submissions.gateway';
import { Judge0Service } from './judge0.service';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    BullModule.registerQueue({
      name: 'judging',
    }),
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, SubmissionsProcessor, SubmissionsGateway, Judge0Service],
  exports: [SubmissionsService, SubmissionsGateway, Judge0Service],
})
export class SubmissionsModule { }
