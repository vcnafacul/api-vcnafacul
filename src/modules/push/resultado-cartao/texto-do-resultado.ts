import { PushPayload } from '../push.regras';
import { PushResultadoCartao } from './push-resultado-cartao.entity';

const corta = (t: string, max: number) =>
  t.length <= max ? t : `${t.slice(0, max - 1)}…`;

/**
 * O push do resultado (tickets/028, R2, R3). "em branco" só aparece se
 * houver; a partir do segundo envio o título diz "atualizado".
 */
export function textoDoResultado(
  r: Pick<
    PushResultadoCartao,
    | 'historicoId'
    | 'simulado'
    | 'acertos'
    | 'erros'
    | 'emBranco'
    | 'aproveitamento'
    | 'envios'
  >,
): PushPayload {
  const partes = [
    `Aproveitamento ${r.aproveitamento}%`,
    `${r.acertos} ${r.acertos === 1 ? 'acerto' : 'acertos'}`,
    `${r.erros} ${r.erros === 1 ? 'erro' : 'erros'}`,
  ];
  if (r.emBranco > 0) partes.push(`${r.emBranco} em branco`);
  return {
    title: corta(
      `📊 ${r.envios > 0 ? 'Resultado atualizado' : 'Resultado'}: ${r.simulado}`,
      100,
    ),
    body: `${partes.join(' · ')}. Toque para ver os detalhes.`,
    url: `/dashboard/simulado/aproveitamento/${r.historicoId}`,
    tag: `resultado-${r.historicoId}`,
  };
}
