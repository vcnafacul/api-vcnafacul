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
import { ClassEssayAnalyticsService } from './class-essay-analytics.service';
import { EssayMonthDtoOutput } from './dtos/essay-month.dto.output';
import { ListEssayMonthsDtoOutput } from './dtos/list-essay-months.dto.output';
import { RefreshEssayDtoOutput } from './dtos/refresh-essay.dto.output';

@ApiTags('Class Essay Analytics')
@Controller('class/:id/analytics/redacao')
export class ClassEssayAnalyticsController {
  constructor(private readonly service: ClassEssayAnalyticsService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarTurmas)
  @ApiResponse({ status: 200, type: ListEssayMonthsDtoOutput })
  async listMonths(@Param('id') id: string, @Req() req: Request) {
    return this.service.listMonths(id, (req.user as User).id);
  }

  @Get(':month')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarTurmas)
  @ApiResponse({ status: 200, type: EssayMonthDtoOutput })
  @ApiResponse({ status: 404 })
  async getByMonth(
    @Param('id') id: string,
    @Param('month') month: string,
    @Req() req: Request,
  ) {
    return this.service.getByMonth(id, month, (req.user as User).id);
  }

  @Post('refresh')
  @HttpCode(202)
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarTurmas)
  @ApiResponse({ status: 202, type: RefreshEssayDtoOutput })
  async refresh(
    @Param('id') id: string,
    @Query('all') all: string,
    @Req() req: Request,
  ) {
    const scope = all === 'true' ? 'all' : 'current';
    return this.service.refresh(id, scope, (req.user as User).id);
  }
}
