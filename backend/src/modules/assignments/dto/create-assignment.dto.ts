export class CreateAssignmentDto {
  classroomId: string;
  problemId: string;
  startTime: string | Date;
  deadline: string | Date;
  isPublished?: boolean;
}
