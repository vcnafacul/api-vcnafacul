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

  /**
   * ⚠️ **Estes três agregados NÃO são públicos** — e já foram, por omissão.
   *
   * A seção "Impacto do Projeto" da Home e do Quem Somos, que é o caso de uso
   * de números públicos, chama outras cinco rotas (ver
   * `client/src/services/public/impactStats.ts`), todas com o prefixo
   * `dashboardPublic*`. Nenhum agregado de histórico participa dela.
   *
   * Os consumidores reais — o widget de simulados do painel e a tela de
   * Monitoramento — já mandam token. O guard não quebrou nenhum.
   *
   * ⚠️ **Sem permissão, de propósito:** o `summary` alimenta um widget que
   * TODO usuário logado vê, inclusive estudante. Exigir papel administrativo
   * ali derrubaria o painel de todo mundo.
   */
  @Get('summary')
  @UseGuards(JwtAuthGuard)
  async getSummary() {
    return await this.service.getSummary();
  }

  @Get('aggregate-by-period')
  @UseGuards(JwtAuthGuard)
  async getAggregateByPeriod(@Query() query: AggregatePeriodDtoInput) {
    return await this.service.getAggregateByPeriod(query.groupBy);
  }

  @Get('aggregate-by-period-and-type')
  @UseGuards(JwtAuthGuard)
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
  async getById(@Param('id') id: string, @Req() req: Request) {
    // ⚠️ O dono vem do JWT, nunca de parâmetro. Sem isto, qualquer usuário
    // autenticado lia o histórico de qualquer outro pelo id — respostas
    // marcadas, gabarito e aproveitamento por matéria. Os dois vizinhos deste
    // controller já escopavam assim; este era o fora da curva.
    return await this.service.getById(id, (req.user as User).id);
  }
}
