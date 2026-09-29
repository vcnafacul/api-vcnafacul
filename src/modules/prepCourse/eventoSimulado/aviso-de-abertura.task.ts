import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventoSimuladoRepository } from './evento-simulado.repository';
import { PushDoEventoService } from './push-do-evento.service';

/**
 * Push de abertura da janela do evento (tickets/026, card 04, R5): a cada 15
 * min, os eventos que abriram e ainda não avisaram.
 *
 * ⚠️ Só reserva com o push HABILITADO. Reservar com ele desligado marcaria o
 * aviso como enviado sem ter saído.
 * ⚠️ Reserva ANTES de enviar (`reservarAviso`): uma vez só, mesmo com duas
 * rodadas ou duas instâncias. Se o envio falhar depois, o aviso não repete —
 * o card no dashboard continua sendo o canal garantido.
 */
@Injectable()
export class AvisoDeAberturaTask {
  private readonly logger = new Logger(AvisoDeAberturaTask.name);

  constructor(
    private readonly eventos: EventoSimuladoRepository,
    private readonly push: PushDoEventoService,
  ) {}

  @Cron('*/15 * * * *', {
    name: 'evento-simulado-aviso-abertura',
    timeZone: 'America/Sao_Paulo',
  })
  async avisar(agora: Date = new Date()): Promise<number> {
    if (!this.push.habilitado()) return 0;
    let enviados = 0;
    for (const evento of await this.eventos.findParaAvisar(agora)) {
      if (!(await this.eventos.reservarAviso(evento.id, agora))) continue;
      await this.push.avisarAbertura(evento);
      enviados++;
    }
    if (enviados) this.logger.log(`Aviso de abertura: ${enviados} evento(s)`);
    return enviados;
  }
}
