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
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { InscreverDtoInput } from './dtos/inscrever.dto';
import { SalvarEventoDtoInput } from './dtos/salvar-evento.dto';
import { GestaoDoEventoService } from './gestao-do-evento.service';
import { InscricaoDoAlunoService } from './inscricao-do-aluno.service';

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
  constructor(
    private readonly gestao: GestaoDoEventoService,
    private readonly inscricao: InscricaoDoAlunoService,
  ) {}

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

  // ---- aluno (card 03) ----
  // ⚠️ `meus` é literal: declarado antes das rotas com `:id`.

  @Get('meus')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description:
      'eventos abertos dos cursinhos em que o aluno está matriculado',
  })
  @UseGuards(JwtAuthGuard)
  async meus(@Req() req: Request) {
    return await this.inscricao.meus((req.user as User).id);
  }

  @Put(':id/inscricao')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'inscreve ou troca de prova' })
  @UseGuards(JwtAuthGuard)
  async inscrever(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: InscreverDtoInput,
  ) {
    return await this.inscricao.inscrever(
      (req.user as User).id,
      id,
      dto.provaId,
    );
  }

  @Delete(':id/inscricao')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async desistir(@Req() req: Request, @Param('id') id: string) {
    await this.inscricao.desistir((req.user as User).id, id);
  }
}
