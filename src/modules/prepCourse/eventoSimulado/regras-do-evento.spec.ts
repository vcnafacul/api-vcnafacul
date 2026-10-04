import { provaCompleta, statusDoEvento } from './regras-do-evento';

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

describe('provaCompleta (card 38) — a mesma regra do "Completa" da tela', () => {
  it.each([
    [
      {
        totalQuestao: 45,
        totalQuestaoValidadas: 45,
        totalQuestaoCadastradas: 45,
      },
      true,
    ],
    [
      {
        totalQuestao: 45,
        totalQuestaoValidadas: 44,
        totalQuestaoCadastradas: 45,
      },
      false,
    ],
    // livre: o alvo são as cadastradas
    [
      {
        totalQuestao: null,
        totalQuestaoValidadas: 12,
        totalQuestaoCadastradas: 12,
      },
      true,
    ],
    [
      {
        totalQuestao: null,
        totalQuestaoValidadas: 10,
        totalQuestaoCadastradas: 12,
      },
      false,
    ],
    // sem questões nunca é completa
    [
      {
        totalQuestao: null,
        totalQuestaoValidadas: 0,
        totalQuestaoCadastradas: 0,
      },
      false,
    ],
  ])('%j → %s', (p, esperado) => {
    expect(provaCompleta(p)).toBe(esperado);
  });
});
