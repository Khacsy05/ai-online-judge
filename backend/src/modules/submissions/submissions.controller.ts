import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SubmissionsService } from './submissions.service';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userId: string,
    @Body('assignmentId') assignmentId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng tải lên file chứa mã nguồn (key: "file").');
    }
    if (!userId) {
      throw new BadRequestException('Trường "userId" là bắt buộc.');
    }
    if (!assignmentId) {
      throw new BadRequestException('Trường "assignmentId" là bắt buộc.');
    }

    return this.submissionsService.create(file, userId, assignmentId);
  }

  @Get()
  async findAll(
    @Query('userId') userId?: string,
    @Query('assignmentId') assignmentId?: string,
  ) {
    return this.submissionsService.findAll(userId, assignmentId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.submissionsService.findOne(id);
  }
}
