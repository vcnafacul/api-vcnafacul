import { Module } from '@nestjs/common';
import { PushModule } from '../push.module';
import { EnvioDoRecalculoTask } from './envio-do-recalculo.task';
import { PushRecalculoAnulacaoRepository } from './push-recalculo-anulacao.repository';

/** Push "nota atualizada" ao fim do recálculo por anulação (tickets/042, card 17). */
@Module({
  imports: [PushModule],
  providers: [PushRecalculoAnulacaoRepository, EnvioDoRecalculoTask],
  exports: [PushRecalculoAnulacaoRepository],
})
export class RecalculoAnulacaoPushModule {}
