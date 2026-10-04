import {
  Body,
  Controller,
  Patch,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { User } from 'src/modules/user/user.entity';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { ApplyJusticationDtoInput } from './dtos/apply-justication.dto.input';
import { UpdateAttendanceDtoInput } from './dtos/update-attendance.dto.input';
import { StudentAttendanceService } from './student-attendance.service';

@ApiTags('Student Attendance')
@Controller('student-attendance')
export class StudentAttendanceController {
  constructor(private readonly service: StudentAttendanceService) {}

  @Patch('present')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTurmas)
  @ApiResponse({
    status: 200,
    description: 'editar presença do aluno',
  })
  async createPartnerPrepCourse(
    @Body() dto: UpdateAttendanceDtoInput,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.updatePresent(dto, (req.user as User).id);
  }

  @Patch('justification')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTurmas)
  @ApiResponse({
    status: 200,
    description: 'editar justificativa do aluno',
  })
  async updateJustificationsForAttendanceRecords(
    @Body() dto: ApplyJusticationDtoInput,
  ): Promise<void> {
    await this.service.updateJustificationsForAttendanceRecords(
      dto.studentCourseId,
      dto.attendanceRecordIds,
      dto.justification,
    );
  }
}
