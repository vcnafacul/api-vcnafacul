import {
  applyDecorators,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { User } from 'src/modules/user/user.entity';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { ConviteColaboradorService } from './convite-colaborador.service';
import { ConviteDtoOutput } from './dtos/convite.output.dto';
import { CriarConviteDtoInput } from './dtos/criar-convite.input.dto';
import { TrocarFuncaoDoConviteDtoInput } from './dtos/trocar-funcao-convite.input.dto';
import { AceitarConviteDtoInput } from './dtos/aceitar-convite.input.dto';
import { ConvitePorTokenDtoOutput } from './dtos/convite-por-token.output.dto';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { CadastrarPeloConviteDtoInput } from './dtos/cadastrar-pelo-convite.input.dto';
import { CreateUserDtoInput } from 'src/modules/user/dto/create.dto.input';
import { Throttle } from '@nestjs/throttler';
import { THROTTLE_CONFIG } from 'src/shared/config/email.config';

/**
 * Convites de colaborador (card 03 de `convite-de-colaborador`).
 *
 * ⚠️ **Tudo `gerenciarPermissoesCursinho`** — decidido 2026-09-24: convidar,
 * escolhendo a função, é do admin do cursinho. Quem só tem
 * `gerenciarColaboradores` não convida.
 *
 * ⚠️ **O guard vai em CADA rota, não na classe.** O `PermissionsGuard` lê a
 * permissão só do handler (`reflector.get(..., context.getHandler())`): com o
 * `@SetMetadata` na classe ele não acha nada e LIBERA — sem nem preencher
 * `req.user`. O e2e deste card pegou isso.
 */
const SoAdminDoCursinho = () =>
  applyDecorators(
    UseGuards(PermissionsGuard),
    SetMetadata(PermissionsGuard.name, Permissions.gerenciarPermissoesCursinho),
  );
@ApiTags('Convites de colaborador')
@Controller('convites-colaborador')
@ApiBearerAuth()
export class ConviteColaboradorController {
  constructor(private readonly service: ConviteColaboradorService) {}

  @Post()
  @SoAdminDoCursinho()
  @ApiResponse({ status: 201, type: ConviteDtoOutput })
  @ApiResponse({
    status: 409,
    description: 'já há convite pendente, ou a pessoa já é colaboradora',
  })
  async criar(@Body() dto: CriarConviteDtoInput, @Req() req: Request) {
    return await this.service.criar(
      (req.user as User).id,
      dto.email,
      dto.roleId,
    );
  }

  /**
   * ⚠️ **Público** — é o que a página do link mostra antes do login. Só
   * responde a quem tem o token.
   */
  @Get('por-token/:token')
  @ApiResponse({ status: 200, type: ConvitePorTokenDtoOutput })
  async porToken(@Param('token') token: string) {
    return await this.service.porToken(token);
  }

  /**
   * ⚠️ **Exige login** (card 04): o token do convite não autentica nada — é só
   * o dado de qual convite aceitar.
   */
  @Post('aceitar')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 201, description: 'virou colaborador, com a função' })
  @ApiResponse({ status: 403, description: 'o convite é para outro email' })
  async aceitar(@Body() dto: AceitarConviteDtoInput, @Req() req: Request) {
    return await this.service.aceitar((req.user as User).id, dto.token);
  }

  /**
   * Cadastro pelo convite (card 05) — público, como o cadastro normal, e já
   * devolve a sessão: a pessoa sai logada, como colaboradora.
   *
   * ⚠️ O refresh vai no cookie httpOnly, igual ao login.
   */
  @Post('cadastrar')
  @Throttle({
    default: {
      ttl: THROTTLE_CONFIG.CREATE_USER.ttl,
      limit: THROTTLE_CONFIG.CREATE_USER.limit,
    },
  })
  @ApiResponse({
    status: 201,
    description: 'conta criada, já colaboradora e logada',
  })
  async cadastrar(
    @Body() dto: CadastrarPeloConviteDtoInput,
    @Res() res: Response,
  ) {
    const { token, ...dados } = dto;
    const sessao = await this.service.cadastrar(
      token,
      dados as CreateUserDtoInput,
    );
    res.cookie('refresh_token', sessao.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.status(201).json({
      access_token: sessao.access_token,
      expires_in: sessao.expires_in,
    });
  }

  @Get()
  @SoAdminDoCursinho()
  @ApiResponse({ status: 200, type: [ConviteDtoOutput] })
  async listar(@Req() req: Request) {
    return await this.service.listar((req.user as User).id);
  }

  @Post(':id/reenviar')
  @SoAdminDoCursinho()
  @ApiResponse({
    status: 201,
    description: 'token novo — o link anterior deixa de valer',
  })
  async reenviar(@Param('id') id: string, @Req() req: Request) {
    return await this.service.reenviar((req.user as User).id, id);
  }

  @Patch(':id')
  @SoAdminDoCursinho()
  async trocarFuncao(
    @Param('id') id: string,
    @Body() dto: TrocarFuncaoDoConviteDtoInput,
    @Req() req: Request,
  ) {
    return await this.service.trocarFuncao(
      (req.user as User).id,
      id,
      dto.roleId,
    );
  }

  @Delete(':id')
  @SoAdminDoCursinho()
  async cancelar(@Param('id') id: string, @Req() req: Request) {
    return await this.service.cancelar((req.user as User).id, id);
  }
}
