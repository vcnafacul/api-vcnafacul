/** tickets/044, D6 — cache dos números recortados por cursinho. */
export const TTL_MONITORAMENTO = 60 * 60 * 1000;

export function chaveDoMonitoramento(
  metrica: string,
  cursinhoId: string,
  ...extras: (string | number | boolean | undefined)[]
): string {
  return ['monitoramento', metrica, cursinhoId, ...extras.map((e) => e ?? '-')]
    .map(String)
    .join(':');
}
