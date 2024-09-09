import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { CreateStudentCourseInput } from './dtos/create-student-course.dto.input';
import { CreateStudentCourseOutput } from './dtos/create-student-course.dto.output';
import { StudentCourseService } from './student-course.service';

@ApiTags('StudentCourse')
@Controller('student-course')
export class StudentCourseController {
  constructor(private readonly service: StudentCourseService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async create(
    @Body() dto: CreateStudentCourseInput,
  ): Promise<CreateStudentCourseOutput> {
    return await this.service.create(dto);
  }
}
