import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
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
}
