import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CentralRepository } from '../central/central.repository';
import { EnvioCalmoDePush } from '../fila/envio-calmo';
import { PushService } from '../push.service';
import { PushRecalculoAnulacao } from './push-recalculo-anulacao.entity';
import {
  notaNaoMudou,
  PushRecalculoAnulacaoRepository,
} from './push-recalculo-anulacao.repository';
import { textoDoRecalculo } from './texto-do-recalculo';

/**
 * Envio calmo do push "nota atualizada" (tickets/042, card 17): o mesmo ritmo
 * do resultado do cartão — um job de 500 alunos sai em ~6 min, sem pico.
 */
@Injectable()
export class EnvioDoRecalculoTask extends EnvioCalmoDePush<PushRecalculoAnulacao> {
  protected readonly logger = new Logger(EnvioDoRecalculoTask.name);

  constructor(
    pendentes: PushRecalculoAnulacaoRepository,
    push: PushService,
    central: CentralRepository,
  ) {
    super(pendentes, push, central);
  }

  protected texto(linha: PushRecalculoAnulacao) {
    return textoDoRecalculo(linha);
  }

  /** Card 20: a nota voltou ao que era — "nota atualizada" seria falso. */
  protected override descartar(linha: PushRecalculoAnulacao) {
    return notaNaoMudou(linha);
  }

  protected rotulo(linha: PushRecalculoAnulacao) {
    return `Nota atualizada ${linha.historicoId} (job ${linha.jobId})`;
  }

  @Cron('7/15 * * * * *', { name: 'push-recalculo-anulacao' })
  async rodar(agora: Date = new Date()): Promise<number> {
    return this.rodada(agora);
  }
}
