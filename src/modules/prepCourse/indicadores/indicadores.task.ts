import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { diaEmSaoPaulo } from './datas';
import { IndicadoresService } from './indicadores.service';

/**
 * Foto diária dos indicadores de cada turma de período aberto (tickets/033).
 * 23h40 para a foto sair antes da meia-noite, quando o período que termina hoje
 * é fechado — mesmo que o cálculo por data dos eventos não dependa disso.
 *
 * ⚠️ Sem lock, como os outros crons do projeto: o upsert por (turma, dia) faz
 * duas rodadas darem no mesmo.
 */
@Injectable()
export class IndicadoresTask {
  private readonly logger = new Logger(IndicadoresTask.name);

  constructor(private readonly service: IndicadoresService) {}

  @Cron('40 23 * * *', {
    name: 'indicadores-diarios',
    timeZone: 'America/Sao_Paulo',
  })
  async fotografar(agora: Date = new Date()) {
    const dia = diaEmSaoPaulo(agora);
    const turmas = await this.service.gravarDia(dia);
    this.logger.log(`Indicadores de ${dia}: ${turmas} turma(s) gravada(s)`);
    return turmas;
  }
}
