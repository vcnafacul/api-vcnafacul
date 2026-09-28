/**
 * Quem está agindo no banco de questões (tickets/023, card 02). O ms-simulado
 * decide com isto se a pessoa pode compor a prova (`podeComporProva`, card 03).
 *
 * ⚠️ **Sempre resolvido aqui, a partir do JWT — nunca do corpo.** Vai ao ms no
 * header `x-ator`, escrito pela api; o cliente não fala com o ms, então não
 * tem como forjá-lo. Mesmo padrão do `x-dono` da categoria.
 */
export type Ator = {
  userId: string;
  /** Cursinho em que colabora (ativo), ou `null`. */
  cursinhoId: string | null;
  /** `criarQuestao || validarQuestao` — do projeto. Confiável só com o card 00. */
  admin: boolean;
  /** `editarQuestoesCursinho`. */
  editorCursinho: boolean;
  /**
   * Quem valida (aprova/recusa) questão — tickets/024, card 02.
   * ⚠️ `validadorProjeto` é só `validarQuestao`: o `admin` acima inclui
   * `criarQuestao`, que é critério de COMPOSIÇÃO, não de validação.
   */
  validadorProjeto?: boolean;
  /** `validarQuestoesCursinho` — aprova qualquer pendente; recusa com regra. */
  validadorCursinho?: boolean;
};

export const HEADER_ATOR = 'x-ator';

export function headerDoAtor(ator: Ator): Record<string, string> {
  return { [HEADER_ATOR]: JSON.stringify(ator) };
}

/**
 * O corpo que vai ao ms sem um `ator` que o cliente tenha mandado. O ms lê o
 * ator só do header, mas não custa não repassar o forjado.
 */
export function semAtor<T>(corpo: T): T {
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) return corpo;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ator, ...resto } = corpo as Record<string, unknown>;
  return resto as T;
}
