import { Period } from '../user/enum/period';

/**
 * Todos os períodos entre o primeiro e o último, inclusive (tickets/044, card 02).
 *
 * ⚠️ Aritmética em texto, sem `Date`: o `buildFullSeriesLastAccess` da plataforma
 * faz `new Date('2026-03')` (meia-noite UTC) e formata no fuso local — fora do
 * UTC a série começa um mês antes. Aqui não há fuso.
 */
export function serieCompleta(groupBy: Period, periodos: string[]): string[] {
  if (periodos.length === 0) return [];
  const ordenados = [...periodos].sort();
  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  const serie: string[] = [];
  let atual = primeiro;
  // teto de segurança: 20 anos em dias
  for (let i = 0; atual <= ultimo && i < 7400; i++) {
    serie.push(atual);
    atual = proximo(groupBy, atual);
  }
  return serie;
}

function proximo(groupBy: Period, periodo: string): string {
  if (groupBy === Period.year) return String(Number(periodo) + 1);
  if (groupBy === Period.month) {
    const [a, m] = periodo.split('-').map(Number);
    return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`;
  }
  const [a, m, d] = periodo.split('-').map(Number);
  const amanha = new Date(Date.UTC(a, m - 1, d + 1));
  return amanha.toISOString().slice(0, 10);
}
