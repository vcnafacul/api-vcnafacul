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
/** Card 38: sem `message`, o class-validator respondia em inglês. */
export const TEXTO_MAXIMO_DE_PROVAS = `Máximo de ${PROVAS_MAX} provas por evento.`;

/**
 * Card 38 — a mesma regra do "Completa" da tela (`statusDaProva` +
 * `alvoDaProva` no client): o alvo é a quantidade da categoria, ou, na
 * categoria livre (`totalQuestao` nulo), as questões cadastradas.
 */
export function provaCompleta(p: {
  totalQuestao: number | null;
  totalQuestaoValidadas: number;
  totalQuestaoCadastradas: number;
}): boolean {
  const alvo =
    p.totalQuestao == null ? p.totalQuestaoCadastradas : p.totalQuestao;
  return alvo > 0 && p.totalQuestaoValidadas >= alvo;
}
