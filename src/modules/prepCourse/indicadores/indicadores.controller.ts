import {
  Controller,
  Get,
  ParseUUIDPipe,
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
import {
  AlunoSumindoDtoOutput,
  IndicadoresDtoOutput,
  PeriodosDoCursinhoDtoOutput,
  ResumoDosIndicadoresDtoOutput,
} from './dtos/indicadores.dto.output';
import { DesempenhoService } from './desempenho.service';
import { DesempenhoDtoOutput } from './dtos/desempenho.dto.output';
import { IndicadoresService } from './indicadores.service';

/**
 * Indicadores do cursinho (tickets/033). Mesmas permissões da lista de
 * estudantes (R7) — e, como em todo o projeto, por rota: o guard só lê o
 * metadado do handler.
 */
@ApiTags('Indicadores do cursinho')
@Controller('indicadores')
export class IndicadoresController {
  constructor(
    private readonly service: IndicadoresService,
    private readonly desempenho: DesempenhoService,
  ) {}

  @Get('periodos')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.visualizarEstudantes,
    Permissions.gerenciarEstudantes,
  ])
  @ApiResponse({
    status: 200,
    description: 'Períodos letivos do cursinho, do mais recente ao mais antigo',
  })
  async periodos(@Req() req: Request): Promise<PeriodosDoCursinhoDtoOutput> {
    return this.service.periodos((req.user as User).id);
  }

  @Get('resumo')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.visualizarEstudantes,
    Permissions.gerenciarEstudantes,
  ])
  @ApiResponse({
    status: 200,
    description:
      'Números do período em andamento, para a dashboard (metricas null sem período aberto)',
  })
  async resumo(@Req() req: Request): Promise<ResumoDosIndicadoresDtoOutput> {
    return this.service.resumo((req.user as User).id);
  }

  @Get('desempenho')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.visualizarEstudantes,
    Permissions.gerenciarEstudantes,
  ])
  @ApiResponse({
    status: 200,
    description:
      'Desempenho dos alunos do período: simulados aplicados por cartão e médias por mês',
  })
  async obterDesempenho(
    @Query('periodoId', ParseUUIDPipe) periodoId: string,
    @Req() req: Request,
  ): Promise<DesempenhoDtoOutput> {
    return this.desempenho.obter(periodoId, (req.user as User).id);
  }

  @Get('sumindo')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.visualizarEstudantes,
    Permissions.gerenciarEstudantes,
  ])
  @ApiResponse({
    status: 200,
    description:
      'Alunos ativos que faltaram às 3 últimas chamadas seguidas da turma',
  })
  async sumindo(
    @Query('periodoId', ParseUUIDPipe) periodoId: string,
    @Req() req: Request,
  ): Promise<AlunoSumindoDtoOutput[]> {
    return this.service.sumindo(periodoId, (req.user as User).id);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.visualizarEstudantes,
    Permissions.gerenciarEstudantes,
  ])
  @ApiResponse({
    status: 200,
    description: 'Indicadores do cursinho e de cada turma no período letivo',
  })
  async obter(
    @Query('periodoId', ParseUUIDPipe) periodoId: string,
    @Req() req: Request,
  ): Promise<IndicadoresDtoOutput> {
    return this.service.obter(periodoId, (req.user as User).id);
  }
}
