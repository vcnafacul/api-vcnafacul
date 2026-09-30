import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AvisoDeResultadoDtoInput } from './aviso-de-resultado.dto';
import { PushResultadoCartaoRepository } from './push-resultado-cartao.repository';
import { SegredoDeNotificacaoGuard } from './segredo-de-notificacao.guard';

/**
 * Aviso interno do ms-simulado (tickets/028, card 02). Só GUARDA: quem envia
 * é a tarefa do card 03, em ritmo — 100 cartões de uma vez não viram 100
 * pushes no mesmo segundo.
 */
@ApiExcludeController()
@Controller('notificacoes')
export class ResultadoCartaoController {
  constructor(private readonly pendentes: PushResultadoCartaoRepository) {}

  @Post('resultado-cartao')
  @HttpCode(202)
  @UseGuards(SegredoDeNotificacaoGuard)
  async avisar(@Body() dto: AvisoDeResultadoDtoInput) {
    await this.pendentes.guardar({
      historicoId: dto.historicoId,
      userId: dto.userId,
      simulado: dto.simulado,
      total: dto.total,
      acertos: dto.acertos,
      erros: dto.erros,
      emBranco: dto.emBranco,
      aproveitamento: dto.aproveitamento,
    });
  }
}
