import {
  Body,
  Controller,
  Post,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/role.entity';
import { User } from 'src/modules/user/user.entity';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { AttendanceRecordService } from './attendance-record.service';
import { CreateAttendanceRecordDtoInput } from './dtos/create-attendance-record.dto.input';

@ApiTags('Attendance Record')
@Controller('attendance-record')
export class AttendanceRecordController {
  constructor(private readonly service: AttendanceRecordService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTurmas)
  @ApiResponse({
    status: 201,
    description: 'criar registro de presença',
  })
  async createPartnerPrepCourse(
    @Body() dto: CreateAttendanceRecordDtoInput,
    @Req() req: Request,
  ): Promise<void> {
    await this.service.create(dto, (req.user as User).id);
  }
}
