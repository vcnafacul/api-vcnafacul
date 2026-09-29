import { statusDoEvento } from './regras-do-evento';

describe('statusDoEvento (026 · 02)', () => {
  const janela = {
    inscricoesDe: new Date('2026-10-01T00:00:00Z'),
    inscricoesAte: new Date('2026-10-10T00:00:00Z'),
  };
  it.each([
    ['2026-09-30T23:59:59Z', 'agendado'],
    ['2026-10-01T00:00:00Z', 'aberto'],
    ['2026-10-09T23:59:59Z', 'aberto'],
    ['2026-10-10T00:00:00Z', 'encerrado'],
  ])('%s → %s', (agora, esperado) => {
    expect(statusDoEvento(janela, new Date(agora))).toBe(esperado);
  });
});
