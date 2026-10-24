import { diasDeChamada, somarDias, inicioDoDia } from './calendario';

describe('calendario', () => {
  it('diasDeChamada devolve só os dias da semana pedidos, dentro do intervalo', () => {
    // 2026-03-02 é segunda
    const dias = diasDeChamada(
      new Date('2026-03-02T00:00:00Z'),
      new Date('2026-03-15T00:00:00Z'),
      [2, 4],
    );
    expect(dias.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2026-03-03',
      '2026-03-05',
      '2026-03-10',
      '2026-03-12',
    ]);
  });

  it('diasDeChamada inclui o último dia', () => {
    const dias = diasDeChamada(
      new Date('2026-03-03T00:00:00Z'),
      new Date('2026-03-03T00:00:00Z'),
      [2],
    );
    expect(dias).toHaveLength(1);
  });

  it('somarDias e inicioDoDia em UTC', () => {
    expect(somarDias(new Date('2026-12-31T00:00:00Z'), 1).toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    );
    expect(inicioDoDia(new Date('2026-10-24T15:30:00Z')).toISOString()).toBe(
      '2026-10-24T00:00:00.000Z',
    );
  });
});
