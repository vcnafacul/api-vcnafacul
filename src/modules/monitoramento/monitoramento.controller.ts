import { Controller, Get, Query, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../role/permissions/permissions';
import {
  MonitoramentoPerfilQueryDto,
  MonitoramentoPeriodoQueryDto,
  MonitoramentoQueryDto,
} from './dtos/monitoramento-query.dto';
import { MonitoramentoService } from './monitoramento.service';

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
  constructor(private readonly service: MonitoramentoService) {}

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
}
