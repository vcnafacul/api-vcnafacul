import { faker } from './aleatorio';

export interface FixtureRespostas {
  respostaBase: Record<string, unknown>;
  variacoes: Record<string, { resposta: unknown; peso: number }[]>;
}

/** Resposta base para todos; só as perguntas que pontuam variam (spec Q1), para o ranking ter ordem. */
export function montarResposta(f: FixtureRespostas): Record<string, unknown> {
  const r = { ...f.respostaBase };
  for (const [pergunta, opcoes] of Object.entries(f.variacoes))
    r[pergunta] = faker.helpers.weightedArrayElement(
      opcoes.map((o) => ({ value: o.resposta, weight: o.peso })),
    );
  return r;
}
