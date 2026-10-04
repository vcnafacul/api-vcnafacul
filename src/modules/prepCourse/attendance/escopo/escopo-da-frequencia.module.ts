import { Module } from '@nestjs/common';
import { EscopoDaFrequencia } from './escopo-da-frequencia.service';

/** Ver `EscopoDaFrequencia` (tickets-documentacao, card 13). */
@Module({
  providers: [EscopoDaFrequencia],
  exports: [EscopoDaFrequencia],
})
export class EscopoDaFrequenciaModule {}
