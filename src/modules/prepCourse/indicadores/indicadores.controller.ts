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
  IndicadoresDtoOutput,
  PeriodosDoCursinhoDtoOutput,
} from './dtos/indicadores.dto.output';
import { IndicadoresService } from './indicadores.service';

/**
 * Indicadores do cursinho (tickets/033). Mesmas permissões da lista de
 * estudantes (R7) — e, como em todo o projeto, por rota: o guard só lê o
 * metadado do handler.
 */
@ApiTags('Indicadores do cursinho')
@Controller('indicadores')
export class IndicadoresController {
  constructor(private readonly service: IndicadoresService) {}

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
