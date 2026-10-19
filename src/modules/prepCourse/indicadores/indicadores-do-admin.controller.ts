import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditLogService } from 'src/modules/audit-log/audit-log.service';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { User } from 'src/modules/user/user.entity';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { DesempenhoService } from './desempenho.service';
import { DesempenhoDtoOutput } from './dtos/desempenho.dto.output';
import {
  AlunoSumindoDtoOutput,
  IndicadoresDtoOutput,
  PeriodosDoCursinhoDtoOutput,
  ResumoDosIndicadoresDtoOutput,
} from './dtos/indicadores.dto.output';
import { IndicadoresRepository } from './indicadores.repository';
import { IndicadoresService } from './indicadores.service';

/**
 * Os indicadores de um cursinho escolhido pelo admin da plataforma
 * (tickets/045): a mesma tela que o cursinho vê.
 *
 * ⚠️ Rotas próprias, e não um parâmetro nas rotas do colaborador: lá o
 * cursinho sai sempre do logado, e é isso que isola um cursinho do outro.
 * Guard em cada handler (o `PermissionsGuard` lê só o handler).
 */
@ApiTags('Indicadores do cursinho')
@ApiBearerAuth()
@Controller('indicadores/cursinho/:cursinhoId')
export class IndicadoresDoAdminController {
  private readonly logger = new Logger(IndicadoresDoAdminController.name);

  constructor(
    private readonly service: IndicadoresService,
    private readonly desempenho: DesempenhoService,
    private readonly repository: IndicadoresRepository,
    private readonly auditoria: AuditLogService,
  ) {}

  private async garantirCursinho(cursinhoId: string) {
    if (!(await this.repository.cursinhoExiste(cursinhoId))) {
      throw new NotFoundException('Cursinho não encontrado');
    }
  }

  @Get('periodos')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  @ApiResponse({ status: 200, description: 'Períodos letivos do cursinho' })
  async periodos(
    @Param('cursinhoId', ParseUUIDPipe) cursinhoId: string,
    @Req() req: Request,
  ): Promise<PeriodosDoCursinhoDtoOutput> {
    await this.garantirCursinho(cursinhoId);
    // D2: a entrada na tela (periodos) fica registrada. Falha aqui não
    // impede a leitura.
    try {
      await this.auditoria.create({
        entityType: 'IndicadoresCursinho',
        entityId: cursinhoId,
        changes: { acao: 'visualizar' },
        updatedBy: (req.user as User).id,
      });
    } catch (err) {
      this.logger.error(`Auditoria dos indicadores de ${cursinhoId}`, err);
    }
    return this.service.periodosDoCursinho(cursinhoId);
  }

  @Get('resumo')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async resumo(
    @Param('cursinhoId', ParseUUIDPipe) cursinhoId: string,
  ): Promise<ResumoDosIndicadoresDtoOutput> {
    await this.garantirCursinho(cursinhoId);
    return this.service.resumoDoCursinho(cursinhoId);
  }

  @Get('desempenho')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async obterDesempenho(
    @Param('cursinhoId', ParseUUIDPipe) cursinhoId: string,
    @Query('periodoId', ParseUUIDPipe) periodoId: string,
  ): Promise<DesempenhoDtoOutput> {
    await this.garantirCursinho(cursinhoId);
    return this.desempenho.obterDoCursinho(periodoId, cursinhoId);
  }

  /** D1: o admin vê os nomes, nunca o telefone. */
  @Get('sumindo')
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async sumindo(
    @Param('cursinhoId', ParseUUIDPipe) cursinhoId: string,
    @Query('periodoId', ParseUUIDPipe) periodoId: string,
  ): Promise<AlunoSumindoDtoOutput[]> {
    await this.garantirCursinho(cursinhoId);
    return this.service.sumindoDoCursinho(periodoId, cursinhoId, false);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
  async obter(
    @Param('cursinhoId', ParseUUIDPipe) cursinhoId: string,
    @Query('periodoId', ParseUUIDPipe) periodoId: string,
  ): Promise<IndicadoresDtoOutput> {
    await this.garantirCursinho(cursinhoId);
    return this.service.obterDoCursinho(periodoId, cursinhoId);
  }
}
