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
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) { }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("STUDENT")
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('assignmentId') assignmentId: string,
    @Req() req: any
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng tải lên file chứa mã nguồn (key: "file").');
    }
    if (!assignmentId) {
      throw new BadRequestException('Trường "assignmentId" là bắt buộc.');
    }

    return this.submissionsService.create(file, assignmentId, req);
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
