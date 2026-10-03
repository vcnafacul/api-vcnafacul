/**
 * Datas dos indicadores. O "dia" é sempre o de São Paulo — é nele que o
 * cursinho pensa ("ativos em 10/05"). O Brasil não tem horário de verão desde
 * 2019, então o fim do dia é fixo em -03:00.
 */

/** `YYYY-MM-DD` de São Paulo para o instante dado. */
export function diaEmSaoPaulo(instante: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
}

/** Último instante do dia `YYYY-MM-DD` em São Paulo. */
export function fimDoDia(dia: string): Date {
  return new Date(`${dia}T23:59:59.999-03:00`);
}

/**
 * `YYYY-MM-DD` de uma data do período letivo. Elas são gravadas como meia-noite
 * UTC do dia escolhido (o client manda só a data), então o dia é o da parte UTC.
 */
export function diaDoPeriodo(data: Date | string): string {
  return new Date(data).toISOString().slice(0, 10);
}

/** Dias de `inicio` a `fim` (inclusive), em `YYYY-MM-DD`. */
export function diasEntre(inicio: string, fim: string): string[] {
  const dias: string[] = [];
  const d = new Date(`${inicio}T12:00:00Z`);
  const ultimo = new Date(`${fim}T12:00:00Z`);
  while (d <= ultimo) {
    dias.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dias;
}
