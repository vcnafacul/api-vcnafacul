import { PushPayload } from '../push.regras';
import { PushRecalculoAnulacao } from './push-recalculo-anulacao.entity';

const corta = (t: string, max: number) =>
  t.length <= max ? t : `${t.slice(0, max - 1)}…`;

/**
 * "Uma questão da prova X foi anulada e sua nota foi atualizada. Acesse a
 * plataforma para mais informações." (tickets/042, D7). O link abre o
 * resultado daquela prova (card 16).
 */
export function textoDoRecalculo(
  r: Pick<
    PushRecalculoAnulacao,
    'historicoId' | 'provaNome' | 'quantasAnuladas'
  >,
): PushPayload {
  const varias = r.quantasAnuladas > 1;
  return {
    title: corta(`📝 Nota atualizada: ${r.provaNome}`, 100),
    body: varias
      ? `Questões da prova ${r.provaNome} foram anuladas e sua nota foi atualizada. Acesse a plataforma para mais informações.`
      : `Uma questão da prova ${r.provaNome} foi anulada e sua nota foi atualizada. Acesse a plataforma para mais informações.`,
    url: `/dashboard/simulado/aproveitamento/${r.historicoId}`,
    tag: `recalculo-${r.historicoId}`,
  };
}
