import { Body, Controller, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateAttendanceDtoInput } from './dtos/update-attendance.dto.input';
import { StudentAttendanceService } from './student-attendance.service';

@ApiTags('Student Attendance')
@Controller('student-attendance')
export class StudentAttendanceController {
  constructor(private readonly service: StudentAttendanceService) {}

  @Patch('present')
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'editar presença do aluno',
  })
  async createPartnerPrepCourse(
    @Body() dto: UpdateAttendanceDtoInput,
  ): Promise<void> {
    await this.service.updatePresent(dto);
  }
}
