import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SegredoDeNotificacaoGuard } from 'src/modules/push/resultado-cartao/segredo-de-notificacao.guard';
import { FimDoRecalculoDtoInput } from './fim-do-recalculo.dto';
import { FimDoRecalculoService } from './fim-do-recalculo.service';

/**
 * Aviso interno do ms ao fim do recálculo por anulação (tickets/042, card 14).
 * Sem JWT: o segredo compartilhado do 028 autoriza.
 */
@ApiExcludeController()
@Controller('notificacoes')
export class FimDoRecalculoController {
  constructor(private readonly service: FimDoRecalculoService) {}

  @Post('recalculo-anulacao')
  @HttpCode(202)
  @UseGuards(SegredoDeNotificacaoGuard)
  receber(@Body() dto: FimDoRecalculoDtoInput) {
    return this.service.receber(dto);
  }
}
