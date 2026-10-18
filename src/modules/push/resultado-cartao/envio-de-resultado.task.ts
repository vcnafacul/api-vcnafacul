import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CentralRepository } from '../central/central.repository';
import { EnvioCalmoDePush } from '../fila/envio-calmo';
import { PushService } from '../push.service';
import { PushResultadoCartao } from './push-resultado-cartao.entity';
import { PushResultadoCartaoRepository } from './push-resultado-cartao.repository';
import { textoDoResultado } from './texto-do-resultado';

export {
  ESPERAS_MIN,
  LOTE,
  PAUSA_MS,
  TENTATIVAS_MAX,
} from '../fila/envio-calmo';

/**
 * Envio calmo do push de resultado do cartão (tickets/028, card 03, R4). A
 * lógica (reserva, ritmo, tentativas) mora no `EnvioCalmoDePush` desde o
 * tickets/042 — a mesma do push "nota atualizada".
 */
@Injectable()
export class EnvioDeResultadoTask extends EnvioCalmoDePush<PushResultadoCartao> {
  protected readonly logger = new Logger(EnvioDeResultadoTask.name);

  constructor(
    pendentes: PushResultadoCartaoRepository,
    push: PushService,
    central: CentralRepository,
  ) {
    super(pendentes, push, central);
  }

  protected texto(linha: PushResultadoCartao) {
    return textoDoResultado(linha);
  }

  protected rotulo(linha: PushResultadoCartao) {
    return `Resultado ${linha.historicoId}`;
  }

  @Cron('*/15 * * * * *', { name: 'push-resultado-cartao' })
  async rodar(agora: Date = new Date()): Promise<number> {
    return this.rodada(agora);
  }
}
