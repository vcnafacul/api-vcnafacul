import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { User } from '../user/user.entity';
import {
  RegistrarAparelhoDtoInput,
  RemoverAparelhoDtoInput,
} from './dtos/registrar-aparelho.dto';
import { PushService } from './push.service';

export const THROTTLE_TESTE = { default: { ttl: 60000, limit: 5 } };
export const THROTTLE_REMOVER = { default: { ttl: 60000, limit: 20 } };

/** Aparelhos do usuário e "enviar teste para mim" (série `pwa-push`, BE-04). */
@ApiTags('Push')
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 204, description: 'Aparelho registrado' })
  @ApiResponse({ status: 503, description: 'Push desativado no ambiente' })
  async registrar(
    @Req() req: Request,
    @Body() dto: RegistrarAparelhoDtoInput,
  ): Promise<void> {
    await this.pushService.registrarAparelho((req.user as User).id, dto);
  }

  /**
   * ⚠️ **Sem JWT, de propósito.** O front também desloga à força quando a
   * sessão expira, e aí não tem JWT válido para mandar. A posse do token FCM
   * já prova que a chamada vem daquele aparelho. Sempre `204`: não revela se
   * o token existia.
   */
  @Delete('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(THROTTLE_REMOVER)
  @ApiResponse({
    status: 204,
    description: 'Aparelho removido (ou já não existia)',
  })
  async remover(@Body() dto: RemoverAparelhoDtoInput): Promise<void> {
    await this.pushService.removerAparelho(dto.token);
  }

  @Get('devices/me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async meus(@Req() req: Request) {
    return this.pushService.aparelhosDoUsuario((req.user as User).id);
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle(THROTTLE_TESTE)
  @ApiResponse({ status: 200, description: '{ successCount, failureCount }' })
  async teste(@Req() req: Request) {
    return this.pushService.enviarTeste((req.user as User).id);
  }
}
