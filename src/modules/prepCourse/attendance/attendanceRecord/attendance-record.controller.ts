import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { User } from 'src/modules/user/user.entity';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { AttendanceRecord } from './attendance-record.entity';
import { AttendanceRecordService } from './attendance-record.service';
import { AttendanceRecordByClassInput } from './dtos/attendance-record-by-class.dto.input';
import { AttendanceRecordByClassOutput } from './dtos/attendance-record-by-class.dto.output';
import { CreateAttendanceRecordDtoInput } from './dtos/create-attendance-record.dto.input';
import { GetAttendanceRecordByIdDtoOutput } from './dtos/get-attendance-record-by-id.dto.output';
import { GetAttendanceRecordByStudent } from './dtos/get-attendance-record-by-student';
import { GetAttendanceRecord } from './dtos/get-attendance-record.dto.input';
import { AttendanceRecordByStudentDtoOutput } from './dtos/attendance-record-by-student.dto.output';
import { ExportAttendanceRecordDtoInput } from './dtos/export-attendance-record.dto.input';

@ApiTags('Attendance Record')
@Controller('attendance-record')
export class AttendanceRecordController {
  constructor(private readonly service: AttendanceRecordService) {}

  /**
   * ⚠️ Era Visualizar Turmas: quem só via a turma criava chamada pela api (e
   * não conseguia editá-la nem excluí-la). A tela já tratava como gestão
   * (tickets-documentacao, card 08).
   */
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

  @Get('summary')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTurmas)
  async summary(
    @Query() dto: AttendanceRecordByClassInput,
  ): Promise<AttendanceRecordByClassOutput> {
    return await this.service.getAttendanceRecordByClassId(dto);
  }

  @Get('summarybystudent')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTurmas)
  @ApiResponse({
    status: 200,
    description: 'relatório de presença por estudante',
    type: AttendanceRecordByStudentDtoOutput,
  })
  async summaryByStudent(
    @Query() dto: AttendanceRecordByClassInput,
  ): Promise<AttendanceRecordByStudentDtoOutput> {
    return await this.service.getStudentPresenceReportByClassId(dto);
  }

  @Get('export')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTurmas)
  async export(
    @Query() dto: ExportAttendanceRecordDtoInput,
    @Res() res: Response,
  ) {
    return this.service.exportToExcel(dto, res);
  }

  // Histórico e detalhe: só a janela de gestão usa (card 08).
  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTurmas)
  @ApiResponse({
    status: 200,
    description: 'buscar registro de presença',
  })
  async findOneById(
    @Param('id') id: string,
  ): Promise<GetAttendanceRecordByIdDtoOutput> {
    return await this.service.findOneById(id);
  }

  // Histórico e detalhe: só a janela de gestão usa (card 08).
  @Get()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTurmas)
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
