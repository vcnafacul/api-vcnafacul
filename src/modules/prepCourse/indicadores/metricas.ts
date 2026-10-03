/**
 * Contagens de uma turma num dia. Cada card da série 033 acrescenta suas
 * chaves; linha antiga sem a chave = "sem dado" (nunca zero).
 *
 * Valores: um número (ex.: `alunos`) ou um mapa de contagens (ex.:
 * `canceladosPorMotivo`).
 */
export type Metricas = Record<string, number | Record<string, number> | null>;

/** Versão atual do formato de `metricas` gravado no snapshot. */
export const VERSAO_DAS_METRICAS = 1;

/**
 * Soma as métricas das turmas, chave a chave. Número soma com número; mapa
 * soma por chave interna. `null` (a turma não tem o dado) não soma — se
 * nenhuma turma tem, a soma também é `null`.
 */
export function somarMetricas(lista: Metricas[]): Metricas {
  const soma: Metricas = {};
  for (const metricas of lista) {
    for (const [chave, valor] of Object.entries(metricas ?? {})) {
      if (valor === null || valor === undefined) {
        if (!(chave in soma)) soma[chave] = null;
        continue;
      }
      const atual = soma[chave];
      if (typeof valor === 'number') {
        soma[chave] = (typeof atual === 'number' ? atual : 0) + valor;
      } else {
        const mapa = { ...(typeof atual === 'object' && atual ? atual : {}) };
        for (const [k, n] of Object.entries(valor))
          mapa[k] = (mapa[k] ?? 0) + n;
        soma[chave] = mapa;
      }
    }
  }
  return soma;
}
