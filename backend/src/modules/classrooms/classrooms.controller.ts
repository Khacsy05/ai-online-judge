import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('classrooms')
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) { }

  @Post()
  create(@Body() createClassroomDto: CreateClassroomDto) {
    return this.classroomsService.create(createClassroomDto);
  }

  @Get()
  findAll() {
    return this.classroomsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classroomsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClassroomDto: UpdateClassroomDto) {
    return this.classroomsService.update(id, updateClassroomDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classroomsService.remove(id);
  }

  @Get(':id/leaderboard')
  @UseGuards(JwtAuthGuard)
  getLeaderboard(@Param('id') id: string) {
    return this.classroomsService.getClassroomLeaderboard(id);
  }

  @Get(':id/my-progress')
  @UseGuards(JwtAuthGuard)
  getMyProgress(@Param('id') id: string, @Req() req: any) {
    return this.classroomsService.getMyClassroomProgress(id, req.user.id);
  }
}
