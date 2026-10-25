import { faker } from './aleatorio';

export interface FixtureRespostas {
  respostaBase: Record<string, unknown>;
  variacoes: Record<string, { resposta: unknown; peso: number }[]>;
}

/**
 * Resposta base + sorteio, com peso, de cada pergunta em `variacoes` (spec Q1:
 * as 5 variam; as que pontuam dão ordem ao ranking, as outras deixam as
 * estatísticas do processo com cara de real). O valor sai como está no
 * fixture: pergunta `Number` continua número.
 */
export function montarResposta(f: FixtureRespostas): Record<string, unknown> {
  const r = { ...f.respostaBase };
  for (const [pergunta, opcoes] of Object.entries(f.variacoes))
    r[pergunta] = faker.helpers.weightedArrayElement(
      opcoes.map((o) => ({ value: o.resposta, weight: o.peso })),
    );
  return r;
}
