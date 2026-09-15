import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { AssignStudentsDto } from './dto/assign-students.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { QueryClassroomsDto } from './dto/query-classrooms.dto';

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

  @Get(':id/available-students')
  getAvailableStudents(
    @Param('id') id: string,
    @Query('search') search?: string,
  ) {
    return this.classroomsService.getAvailableStudents(id, search);
  }

  @Post(':id/assign-students')
  assignStudents(
    @Param('id') id: string,
    @Body() assignStudentsDto: AssignStudentsDto,
  ) {
    return this.classroomsService.assignStudents(id, assignStudentsDto);
  }

  @Delete(':id/students')
  removeStudentsFromClass(
    @Param('id') id: string,
    @Body('userIds') userIds: string[],
  ) {
    return this.classroomsService.removeStudentsFromClass(id, userIds);
  }

  @Delete(':id/students/:userId')
  removeStudentFromClass(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.classroomsService.removeStudentFromClass(id, userId);
  }

  @Get(':id/leaderboard')
  @UseGuards(JwtAuthGuard)
  getLeaderboard(@Param('id') id: string, @Query() query: QueryClassroomsDto) {
    return this.classroomsService.getClassroomLeaderboard(id, query);
  }

  @Get(':id/my-progress')
  @UseGuards(JwtAuthGuard)
  getMyProgress(@Param('id') id: string, @Req() req: any) {
    return this.classroomsService.getMyClassroomProgress(id, req.user.id);
  }
}
