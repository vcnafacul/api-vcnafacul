import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { User } from '../../user/user.entity';
import { CentralService } from './central.service';

export const LIMITE_DA_CENTRAL = 50;

export class ListarCentralDtoInput {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIMITE_DA_CENTRAL)
  limit: number = 20;
}

/**
 * Central de notificações de quem está logado (card 02). Cada um vê e marca
 * só as suas — o id do usuário vem do JWT, nunca da rota.
 *
 * ⚠️ `lidas` (literal) declarada ANTES de `:id/lida`: as duas são PATCH e o
 * Nest casa na ordem.
 */
@ApiTags('Central de notificações')
@ApiBearerAuth()
@Controller('me/notificacoes')
export class CentralController {
  constructor(private readonly central: CentralService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: '{ data, page, limit, totalItems, naoLidas }',
  })
  async listar(@Req() req: Request, @Query() q: ListarCentralDtoInput) {
    return this.central.listar((req.user as User).id, q.page, q.limit);
  }

  @Patch('lidas')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: '{ marcadas }' })
  async marcarTodas(@Req() req: Request) {
    return this.central.marcarTodas((req.user as User).id);
  }

  @Patch(':id/lida')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 204, description: 'Marcada (ou já estava)' })
  @ApiResponse({ status: 404, description: 'Não existe ou é de outra pessoa' })
  async marcarLida(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.central.marcarLida((req.user as User).id, id);
  }
}
