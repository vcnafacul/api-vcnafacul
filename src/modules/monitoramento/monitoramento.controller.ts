import { Controller, Get, Query, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/permissions/permissions';
import {
  MonitoramentoPerfilQueryDto,
  MonitoramentoPeriodoQueryDto,
  MonitoramentoQueryDto,
  UltimosProcessosQueryDto,
} from './dtos/monitoramento-query.dto';
import { MonitoramentoService } from './monitoramento.service';
import { SimuladosDoCursinhoService } from './simulados-do-cursinho.service';

/**
 * A tela de Monitoramento recortada por cursinho (tickets/044).
 *
 * ⚠️ Guard em CADA handler: o `PermissionsGuard` lê só o metadado do handler, e
 * na classe ele liberaria tudo. A permissão é a da página (`criarQuestao`, D5);
 * a contagem de estudantes exige `visualizarEstudantes`, como os KPIs globais
 * (`dashboard/students-*`).
 */
@ApiTags('Monitoramento')
@ApiBearerAuth()
@Controller('monitoramento')
export class MonitoramentoController {
  constructor(
    private readonly service: MonitoramentoService,
    private readonly simulados: SimuladosDoCursinhoService,
  ) {}

  @Get('resumo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.criarQuestao)
  async resumo(@Query() { cursinhoId }: MonitoramentoQueryDto) {
    return this.service.resumo(cursinhoId);
  }

  @Get('estudantes')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarEstudantes)
  async estudantes(@Query() { cursinhoId }: MonitoramentoQueryDto) {
    return this.service.estudantesDoCursinho(cursinhoId);
  }

  @Get('usuarios-por-perfil')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.criarQuestao)
  async usuariosPorPerfil(
    @Query() { cursinhoId, baseOnly }: MonitoramentoPerfilQueryDto,
  ) {
    return this.service.usuariosPorPerfil(cursinhoId, baseOnly);
  }

  @Get('ultimo-acesso')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.criarQuestao)
  async ultimoAcesso(
    @Query() { cursinhoId, groupBy }: MonitoramentoPeriodoQueryDto,
  ) {
    return this.service.ultimoAcesso(cursinhoId, groupBy);
  }

  @Get('inscricoes-por-periodo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.criarQuestao)
  async inscricoesPorPeriodo(
    @Query() { cursinhoId, groupBy }: MonitoramentoPeriodoQueryDto,
  ) {
    return this.service.inscricoesPorPeriodo(cursinhoId, groupBy);
  }

  @Get('ultimos-processos')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.criarQuestao)
  async ultimosProcessos(
    @Query() { cursinhoId, limite }: UltimosProcessosQueryDto,
  ) {
    return this.service.ultimosProcessos(limite, cursinhoId);
  }

  @Get('simulados/resumo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.criarQuestao)
  async simuladosResumo(@Query() { cursinhoId }: MonitoramentoQueryDto) {
    await this.service.garantirCursinho(cursinhoId);
    return this.simulados.resumo(cursinhoId);
  }

  @Get('simulados/por-periodo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.criarQuestao)
  async simuladosPorPeriodo(
    @Query() { cursinhoId, groupBy }: MonitoramentoPeriodoQueryDto,
  ) {
    await this.service.garantirCursinho(cursinhoId);
    return this.simulados.porPeriodo(cursinhoId, groupBy);
  }

  @Get('simulados/por-tipo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.criarQuestao)
  async simuladosPorTipo(
    @Query() { cursinhoId, groupBy }: MonitoramentoPeriodoQueryDto,
  ) {
    await this.service.garantirCursinho(cursinhoId);
    return this.simulados.porTipo(cursinhoId, groupBy);
  }
}
