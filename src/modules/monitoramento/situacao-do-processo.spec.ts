import { situacaoDoProcesso } from './monitoramento.repository';

describe('situacaoDoProcesso (044/03)', () => {
  const inicio = new Date('2026-03-01T00:00:00Z');
  const fim = new Date('2026-03-31T23:59:59Z');

  it.each([
    ['2026-02-28T12:00:00Z', 'futuro'],
    ['2026-03-01T00:00:00Z', 'aberto'],
    ['2026-03-15T12:00:00Z', 'aberto'],
    ['2026-03-31T23:59:59Z', 'aberto'],
    ['2026-04-01T00:00:00Z', 'encerrado'],
  ])('%s → %s', (agora, esperado) => {
    expect(situacaoDoProcesso(inicio, fim, new Date(agora))).toBe(esperado);
  });
});
