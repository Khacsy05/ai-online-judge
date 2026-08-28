import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { SubmissionsProcessor } from './submissions.processor';
import { AiModule } from '../ai/ai.module';
import { SubmissionsGateway } from './submissions.gateway';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    BullModule.registerQueue({
      name: 'judging',
    }),
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, SubmissionsProcessor, SubmissionsGateway],
  exports: [SubmissionsService, SubmissionsGateway],
})
export class SubmissionsModule { }
