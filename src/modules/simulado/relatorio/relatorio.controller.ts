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
import { DetalheDoEstudanteDtoOutput } from './dtos/detalhe-do-estudante.dto.output';
import { QuestoesDoRelatorioDtoOutput } from './dtos/questoes-do-relatorio.dto.output';
import { RelatorioDtoOutput } from './dtos/relatorio.dto.output';
import { SimuladosComCartaoDtoOutput } from './dtos/simulados-com-cartao.dto.output';
import { RelatorioService } from './relatorio.service';

const RESPOSTA_403 = {
  status: 403,
  description:
    'turma não pertence ao seu cursinho, ou falta a permissão gerenciarEstudantes',
};

@ApiTags('Simulado - Relatório')
@Controller('mssimulado/relatorio/simulado')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RelatorioController {
  constructor(private readonly service: RelatorioService) {}

  /**
   * ⚠️ **PRIMEIRAS rotas da classe, e isso não é estilo.** `simulados` tem a
   * mesma contagem de segmentos que `:simuladoId`; declarada depois, o param
   * a captura e o handler errado roda com `simuladoId = "simulados"`.
   * Nenhum teste de unidade pega — só o `relatorio-rotas.controller.spec.ts`,
   * que sobe o app.
   */
  @Get('simulados/turma/:turmaId')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'simulados com cartão da turma',
    type: SimuladosComCartaoDtoOutput,
  })
  @ApiResponse(RESPOSTA_403)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarEstudantes)
  async simuladosPorTurma(
    @Param('turmaId') turmaId: string,
    @Req() req: Request,
  ): Promise<SimuladosComCartaoDtoOutput> {
    return this.service.listarSimulados((req.user as User).id, turmaId);
  }

  @Get('simulados')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'simulados com cartão do cursinho',
    type: SimuladosComCartaoDtoOutput,
  })
  @ApiResponse(RESPOSTA_403)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarEstudantes)
  async simulados(@Req() req: Request): Promise<SimuladosComCartaoDtoOutput> {
    return this.service.listarSimulados((req.user as User).id);
  }

  @Get(':simuladoId/turma/:turmaId/questoes')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'agregado por questão da turma',
    type: QuestoesDoRelatorioDtoOutput,
  })
  @ApiResponse(RESPOSTA_403)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarEstudantes)
  async questoesPorTurma(
    @Param('simuladoId') simuladoId: string,
    @Param('turmaId') turmaId: string,
    @Req() req: Request,
  ): Promise<QuestoesDoRelatorioDtoOutput> {
    return this.service.consultarQuestoes(
      (req.user as User).id,
      simuladoId,
      turmaId,
    );
  }

  @Get(':simuladoId/turma/:turmaId')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: RelatorioDtoOutput })
  @ApiResponse(RESPOSTA_403)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarEstudantes)
  async porTurma(
    @Param('simuladoId') simuladoId: string,
    @Param('turmaId') turmaId: string,
    @Req() req: Request,
  ): Promise<RelatorioDtoOutput> {
    return this.service.consultar((req.user as User).id, simuladoId, turmaId);
  }

  @Get(':simuladoId/estudante/:userId')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'o que o estudante marcou e o que era correto',
    type: DetalheDoEstudanteDtoOutput,
  })
  @ApiResponse({
    status: 404,
    description: 'estudante não tem cartão neste simulado',
  })
  @ApiResponse(RESPOSTA_403)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarEstudantes)
  async detalheDoEstudante(
    @Param('simuladoId') simuladoId: string,
    @Param('userId') userId: string,
    @Req() req: Request,
  ): Promise<DetalheDoEstudanteDtoOutput> {
    return this.service.consultarDetalhe(
      (req.user as User).id,
      simuladoId,
      userId,
    );
  }

  @Get(':simuladoId/questoes')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'agregado por questão do cursinho',
    type: QuestoesDoRelatorioDtoOutput,
  })
  @ApiResponse(RESPOSTA_403)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarEstudantes)
  async questoesGeral(
    @Param('simuladoId') simuladoId: string,
    @Req() req: Request,
  ): Promise<QuestoesDoRelatorioDtoOutput> {
    return this.service.consultarQuestoes((req.user as User).id, simuladoId);
  }

  @Get(':simuladoId')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: RelatorioDtoOutput })
  @ApiResponse(RESPOSTA_403)
  @SetMetadata(PermissionsGuard.name, Permissions.gerenciarEstudantes)
  async geral(
    @Param('simuladoId') simuladoId: string,
    @Req() req: Request,
  ): Promise<RelatorioDtoOutput> {
    return this.service.consultar((req.user as User).id, simuladoId);
  }
}
