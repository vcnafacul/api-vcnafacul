import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/role.entity';
import { User } from 'src/modules/user/user.entity';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { AttendanceRecord } from './attendance-record.entity';
import { AttendanceRecordService } from './attendance-record.service';
import { CreateAttendanceRecordDtoInput } from './dtos/create-attendance-record.dto.input';
import { GetAttendanceRecordByIdDtoOutput } from './dtos/get-attendance-record-by-id.dto.output';
import { GetAttendanceRecordByStudent } from './dtos/get-attendance-record-by-student';
import { GetAttendanceRecord } from './dtos/get-attendance-record.dto.input';

@ApiTags('Attendance Record')
@Controller('attendance-record')
export class AttendanceRecordController {
  constructor(private readonly service: AttendanceRecordService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarTurmas)
  @ApiResponse({
    status: 201,
    description: 'criar registro de presença',
  })
  async createPartnerPrepCourse(
    @Body() dto: CreateAttendanceRecordDtoInput,
    @Req() req: Request,
  ): Promise<AttendanceRecord> {
    return await this.service.create(dto, (req.user as User).id);
  }

  @Get('student')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarTurmas)
  @ApiResponse({
    status: 200,
    description: 'buscar registro de presença',
  })
  async findManyByStudentId(
    @Query() query: GetAttendanceRecordByStudent,
  ): Promise<GetAllOutput<AttendanceRecord>> {
    return await this.service.findManyByStudentId(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarTurmas)
  @ApiResponse({
    status: 200,
    description: 'buscar registro de presença',
  })
  async findOneById(
    @Param('id') id: string,
  ): Promise<GetAttendanceRecordByIdDtoOutput> {
    return await this.service.findOneById(id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarTurmas)
  @ApiResponse({
    status: 200,
    description: 'buscar registros de presenca',
  })
  async findAll(
    @Query() query: GetAttendanceRecord,
  ): Promise<GetAllOutput<AttendanceRecord>> {
    return await this.service.findAll(query);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTurmas)
  @ApiResponse({
    status: 204,
    description: 'deletar registro de presença',
  })
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.delete(id);
  }
}
