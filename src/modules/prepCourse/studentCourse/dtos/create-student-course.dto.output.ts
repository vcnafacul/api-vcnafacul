import { ApiProperty } from '@nestjs/swagger';

export class CreateStudentCourseOutput {
  @ApiProperty()
  id: number;
}
