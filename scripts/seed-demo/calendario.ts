const DIA = 24 * 60 * 60 * 1000;

export const inicioDoDia = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export const somarDias = (d: Date, n: number) =>
  new Date(d.getTime() + n * DIA);

export const menor = (a: Date, b: Date) => (a < b ? a : b);
export const maior = (a: Date, b: Date) => (a > b ? a : b);

/** Dias (UTC meia-noite) entre `de` e `ate`, inclusive, cujo getUTCDay está em `diasDaSemana`. */
export function diasDeChamada(
  de: Date,
  ate: Date,
  diasDaSemana: readonly number[],
) {
  const dias: Date[] = [];
  for (let d = inicioDoDia(de); d <= ate; d = somarDias(d, 1))
    if (diasDaSemana.includes(d.getUTCDay())) dias.push(d);
  return dias;
}
