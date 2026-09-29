import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { User } from 'src/modules/user/user.entity';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { SalvarEventoDtoInput } from './dtos/salvar-evento.dto';
import { GestaoDoEventoService } from './gestao-do-evento.service';

/**
 * Eventos de simulado presencial (tickets/026).
 *
 * ⚠️ Controller próprio (não o do cursinho): o módulo precisa de aluno,
 * colaborador e push — importar no módulo do cursinho fecharia ciclo.
 * Rotas do cursinho em `cursinho/...`; as do aluno vêm no card 03.
 */
@ApiTags('Eventos de simulado')
@Controller('eventos-simulado')
export class EventoSimuladoController {
  constructor(private readonly gestao: GestaoDoEventoService) {}

  @Get('cursinho')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'eventos do cursinho do usuário' })
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, [
    Permissions.visualizarProvasCursinho,
    Permissions.cadastrarProvasCursinho,
  ])
  async listar(@Req() req: Request) {
    return await this.gestao.listar((req.user as User).id);
  }

  @Post('cursinho')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.cadastrarProvasCursinho)
  async criar(@Req() req: Request, @Body() dto: SalvarEventoDtoInput) {
    return await this.gestao.criar((req.user as User).id, dto);
  }

  @Put('cursinho/:id')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.cadastrarProvasCursinho)
  async editar(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SalvarEventoDtoInput,
  ) {
    return await this.gestao.editar((req.user as User).id, id, dto);
  }

  @Delete('cursinho/:id')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.cadastrarProvasCursinho)
  async excluir(@Req() req: Request, @Param('id') id: string) {
    await this.gestao.excluir((req.user as User).id, id);
  }
}
