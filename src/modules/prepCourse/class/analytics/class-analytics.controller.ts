import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { User } from 'src/modules/user/user.entity';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { ClassAnalyticsService } from './class-analytics.service';
import { ListMonthsDtoOutput } from './dtos/list-months.dto.output';
import { MonthAnalyticsDtoOutput } from './dtos/month-analytics.dto.output';
import { RefreshDtoOutput } from './dtos/refresh.dto.output';

@ApiTags('Class Analytics')
@Controller('class/:id/analytics')
export class ClassAnalyticsController {
  constructor(private readonly service: ClassAnalyticsService) {}

  @Get('simulado')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarTurmas)
  @ApiResponse({ status: 200, type: ListMonthsDtoOutput })
  async listMonths(@Param('id') id: string, @Req() req: Request) {
    return this.service.listMonths(id, (req.user as User).id);
  }

  @Get('simulado/:month')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarTurmas)
  @ApiResponse({ status: 200, type: MonthAnalyticsDtoOutput })
  @ApiResponse({ status: 404 })
  async getByMonth(
    @Param('id') id: string,
    @Param('month') month: string,
    @Req() req: Request,
  ) {
    return this.service.getByMonth(id, month, (req.user as User).id);
  }

  @Post('simulado/refresh')
  @HttpCode(202)
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTurmas)
  @ApiResponse({ status: 202, type: RefreshDtoOutput })
  async refresh(
    @Param('id') id: string,
    @Query('all') all: string,
    @Req() req: Request,
  ) {
    const scope = all === 'true' ? 'all' : 'current';
    return this.service.refresh(id, scope, (req.user as User).id);
  }
}
