import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { Permissions } from '../../role/permissions/permissions';
import { User } from '../../user/user.entity';
import {
  BuscarDestinatariosDtoInput,
  EnviarNotificacaoDtoInput,
  PreviewDoPublicoDtoInput,
} from './enviar-notificacao.dto';
import { PushAdminService } from './push-admin.service';

/**
 * Tela admin de push (série `pwa-push`, BE-06).
 *
 * ⚠️ **Guardas POR ROTA.** O `PermissionsGuard` lê a metadata só do handler:
 * `@SetMetadata` na classe liberaria tudo. E o `JwtAuthGuard` vem antes, para
 * sem token dar `401` (o `PermissionsGuard` sozinho daria `403`).
 */
export const THROTTLE_TESTE = { default: { ttl: 60000, limit: 5 } };

@ApiTags('Push admin')
@ApiBearerAuth()
@Controller('push')
export class PushAdminController {
  constructor(private readonly admin: PushAdminService) {}

  @Post('audience/preview')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.enviarNotificacao)
  @ApiResponse({ status: 200, description: '{ targetUsers, targetDevices }' })
  async preview(@Body() dto: PreviewDoPublicoDtoInput) {
    return this.admin.preview(dto);
  }

  /**
   * Busca de "Pessoas específicas": por nome ou e-mail, como na tela de
   * usuários, com quantos aparelhos ativos cada pessoa tem. Não usa o
   * `GET /user` porque ele exige `alterarPermissao`.
   */
  @Get('recipients')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.enviarNotificacao)
  @ApiResponse({ status: 200, description: '[{ id, name, email, devices }]' })
  async destinatarios(@Query() { q }: BuscarDestinatariosDtoInput) {
    return this.admin.buscarDestinatarios(q ?? '');
  }

  @Post('send')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.enviarNotificacao)
  @ApiResponse({ status: 202, description: 'Envio aceito; acompanhar pelo id' })
  @ApiResponse({ status: 422, description: 'Ninguém no público ativou push' })
  async enviar(@Body() dto: EnviarNotificacaoDtoInput, @Req() req: Request) {
    return this.admin.enviar(dto, (req.user as User).id);
  }

  /**
   * "Enviar notificação de teste" para os aparelhos de quem chama. Só para
   * quem pode enviar notificações (decisão do Fernando, 2026-09-27): para o
   * resto, o botão nem aparece em Minha conta.
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.enviarNotificacao)
  @Throttle(THROTTLE_TESTE)
  @ApiResponse({ status: 200, description: '{ successCount, failureCount }' })
  async teste(@Req() req: Request) {
    return this.admin.enviarTeste((req.user as User).id);
  }

  @Get('notifications')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.enviarNotificacao)
  async historico(@Query() { page, limit }: GetAllDtoInput) {
    return this.admin.historico(page, limit);
  }

  @Get('notifications/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.enviarNotificacao)
  async detalhe(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.detalhe(id);
  }
}
