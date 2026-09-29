import { Module } from '@nestjs/common';
import { EventoSimuladoRepository } from './evento-simulado.repository';

/** Eventos de simulado presencial do cursinho (tickets/026). */
@Module({
  providers: [EventoSimuladoRepository],
  exports: [EventoSimuladoRepository],
})
export class EventoSimuladoModule {}
