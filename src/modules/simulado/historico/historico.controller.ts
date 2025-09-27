import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from 'src/modules/user/user.entity';
import { AggregatePeriodDtoInput } from 'src/shared/dtos/aggregate-period.dto.input';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { GetHistoricoDTOInput } from '../dtos/get-historico.dto';
import { HistoricoService } from './historico.service';

@ApiTags('Historico')
@Controller('mssimulado/historico')
export class HistoricoController {
  constructor(private readonly service: HistoricoService) {}

  @Get()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'obtém todos os históricos de simulados',
  })
  @UseGuards(JwtAuthGuard)
  async getAllByUser(
    @Query() query: GetHistoricoDTOInput,
    @Req() req: Request,
  ) {
    return await this.service.getAllByUser(query, (req.user as User).id);
  }

  @Get('performance')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'obtém histórico de performance por usuário',
    isArray: true,
  })
  async getPerformance(@Req() req: Request) {
    return await this.service.getPerformance((req.user as User).id);
  }

  @Get('summary')
  async getSummary() {
    return await this.service.getSummary();
  }

  @Get('aggregate-by-period')
  async getAggregateByPeriod(@Query() query: AggregatePeriodDtoInput) {
    return await this.service.getAggregateByPeriod(query.groupBy);
  }

  @Get('aggregate-by-period-and-type')
  async getAggregateByPeriodAndType(@Query() query: AggregatePeriodDtoInput) {
    return await this.service.getAggregateByPeriodAndType(query.groupBy);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'obtém histórico detalhado por ID',
  })
  @UseGuards(JwtAuthGuard)
  async getById(@Param('id') id: string) {
    return await this.service.getById(id);
  }
}
