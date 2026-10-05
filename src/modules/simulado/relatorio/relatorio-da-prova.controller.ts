import {
  Controller,
  Get,
  Param,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { User } from 'src/modules/user/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import {
  QuestoesDaProvaDtoOutput,
  RelatorioDaProvaDtoOutput,
} from './dtos/relatorio-da-prova.dto.output';
import { RelatorioService } from './relatorio.service';

const RESPOSTA_403 = {
  status: 403,
  description:
    'turma não pertence ao seu cursinho, ou falta a permissão gerenciarEstudantes',
};

/**
 * O relatório da PROVA — o agregado dos simulados dela (tickets/034).
 *
 * ⚠️ **Controller próprio**, com prefixo que nenhuma rota do simulado
 * compartilha: dentro do `mssimulado/relatorio/simulado`, `prova/:provaId`
 * teria a contagem de segmentos de `:simuladoId/questoes`.
 *
 * ⚠️ A permissão é declarada em CADA rota — o `PermissionsGuard` lê só o
 * handler, e na classe ela não valeria nada.
 */
@ApiTags('Simulado - Relatório')
@Controller('mssimulado/relatorio/prova')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RelatorioDaProvaController {
  constructor(private readonly service: RelatorioService) {}

  @Get(':provaId/turma/:turmaId/questoes')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'agregado por questão dos simulados da prova, na turma',
    type: QuestoesDaProvaDtoOutput,
  })
  @ApiResponse(RESPOSTA_403)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarEstudantes)
  async questoesPorTurma(
    @Param('provaId') provaId: string,
    @Param('turmaId') turmaId: string,
    @Req() req: Request,
  ): Promise<QuestoesDaProvaDtoOutput> {
    return this.service.consultarQuestoesDaProva(
      (req.user as User).id,
      provaId,
      turmaId,
    );
  }

  @Get(':provaId/turma/:turmaId')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: RelatorioDaProvaDtoOutput })
  @ApiResponse(RESPOSTA_403)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarEstudantes)
  async porTurma(
    @Param('provaId') provaId: string,
    @Param('turmaId') turmaId: string,
    @Req() req: Request,
  ): Promise<RelatorioDaProvaDtoOutput> {
    return this.service.consultarProva((req.user as User).id, provaId, turmaId);
  }

  @Get(':provaId/questoes')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'agregado por questão dos simulados da prova, no cursinho',
    type: QuestoesDaProvaDtoOutput,
  })
  @ApiResponse(RESPOSTA_403)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarEstudantes)
  async questoesGeral(
    @Param('provaId') provaId: string,
    @Req() req: Request,
  ): Promise<QuestoesDaProvaDtoOutput> {
    return this.service.consultarQuestoesDaProva(
      (req.user as User).id,
      provaId,
    );
  }

  @Get(':provaId')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: RelatorioDaProvaDtoOutput })
  @ApiResponse(RESPOSTA_403)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarEstudantes)
  async geral(
    @Param('provaId') provaId: string,
    @Req() req: Request,
  ): Promise<RelatorioDaProvaDtoOutput> {
    return this.service.consultarProva((req.user as User).id, provaId);
  }
}
