import { EventoSimulado } from './evento-simulado.entity';

/** Regras puras do evento de simulado (tickets/026). */

export type StatusDoEvento = 'agendado' | 'aberto' | 'encerrado';

/** Pela janela do EVENTO (R2): antes = agendado, dentro = aberto, depois = encerrado. */
export function statusDoEvento(
  evento: Pick<EventoSimulado, 'inscricoesDe' | 'inscricoesAte'>,
  agora = new Date(),
): StatusDoEvento {
  if (agora < new Date(evento.inscricoesDe)) return 'agendado';
  if (agora >= new Date(evento.inscricoesAte)) return 'encerrado';
  return 'aberto';
}

export const PROVAS_MAX = 10;
