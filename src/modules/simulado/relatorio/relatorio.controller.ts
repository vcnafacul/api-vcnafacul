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
import { QuestoesDoRelatorioDtoOutput } from './dtos/questoes-do-relatorio.dto.output';
import { RelatorioDtoOutput } from './dtos/relatorio.dto.output';
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
