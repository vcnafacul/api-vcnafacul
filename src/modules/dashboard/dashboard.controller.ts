import { Controller, Get, Req, SetMetadata, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../shared/guards/permission.guard';
import { Permissions } from '../role/role.entity';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get('student')
  async getStudentDashboard(@Req() req: any) {
    return this.dashboardService.getStudentDashboard(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('collaborator')
  async getCollaboratorDashboard(@Req() req: any) {
    return this.dashboardService.getCollaboratorDashboard(req.user.id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.validarQuestao)
  @Get('questoes-pendentes')
  async getQuestoesPendentes(@Req() req: any) {
    return this.dashboardService.getQuestoesPendentes(req.user.id);
  }
}
