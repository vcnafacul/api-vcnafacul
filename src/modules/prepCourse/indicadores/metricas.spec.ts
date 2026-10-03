import { diasEntre, diaDoPeriodo, fimDoDia } from './datas';
import { somarMetricas } from './metricas';

describe('somarMetricas', () => {
  it('soma número com número e mapa por chave', () => {
    expect(
      somarMetricas([
        { alunos: 10, motivos: { Rotina: 1 } },
        { alunos: 5, motivos: { Rotina: 2, Transporte: 1 } },
      ]),
    ).toEqual({ alunos: 15, motivos: { Rotina: 3, Transporte: 1 } });
  });

  it('⚠️ null não vira zero: só soma quem tem o dado', () => {
    expect(somarMetricas([{ freq: null }, { freq: 3 }])).toEqual({ freq: 3 });
    expect(somarMetricas([{ freq: null }, { freq: null }])).toEqual({
      freq: null,
    });
  });

  it('chave que só uma turma tem entra como está; lista vazia → {}', () => {
    expect(somarMetricas([{ a: 1 }, { b: 2 }])).toEqual({ a: 1, b: 2 });
    expect(somarMetricas([])).toEqual({});
  });
});

describe('datas dos indicadores', () => {
  it('fim do dia é 23:59:59.999 de São Paulo', () => {
    expect(fimDoDia('2026-05-10').toISOString()).toBe(
      '2026-05-11T02:59:59.999Z',
    );
  });

  it('dia do período vem da parte UTC (gravado como meia-noite UTC)', () => {
    expect(diaDoPeriodo(new Date('2026-02-01T00:00:00Z'))).toBe('2026-02-01');
  });

  it('dias entre, inclusive, atravessando o mês', () => {
    expect(diasEntre('2026-01-30', '2026-02-02')).toEqual([
      '2026-01-30',
      '2026-01-31',
      '2026-02-01',
      '2026-02-02',
    ]);
  });
});
