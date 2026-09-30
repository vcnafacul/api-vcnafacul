import { Module } from '@nestjs/common';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { PushModule } from '../push.module';
import { EnvioDeResultadoTask } from './envio-de-resultado.task';
import { PushResultadoCartaoRepository } from './push-resultado-cartao.repository';
import { ResultadoCartaoController } from './resultado-cartao.controller';
import { SegredoDeNotificacaoGuard } from './segredo-de-notificacao.guard';

/** Push com o resultado do cartão-resposta (tickets/028). */
@Module({
  imports: [EnvModule, PushModule],
  controllers: [ResultadoCartaoController],
  providers: [
    PushResultadoCartaoRepository,
    SegredoDeNotificacaoGuard,
    EnvioDeResultadoTask,
  ],
})
export class ResultadoCartaoModule {}
