/* eslint-disable @typescript-eslint/no-var-requires */
const { avaliar } = require('./checar-cobertura');

/** Um arquivo com N statements/linhas, dos quais `cobertas` foram executadas. */
const arquivo = (caminho: string, total: number, cobertas: number) => {
  const statementMap: Record<string, unknown> = {};
  const s: Record<string, number> = {};
  for (let i = 0; i < total; i++) {
    statementMap[i] = {
      start: { line: i + 1, column: 0 },
      end: { line: i + 1, column: 10 },
    };
    s[i] = i < cobertas ? 1 : 0;
  }
  return {
    [caminho]: {
      path: caminho,
      statementMap,
      fnMap: {},
      branchMap: {},
      s,
      f: {},
      b: {},
    },
  };
};

describe('checar-cobertura — junta os shards e confere os limites', () => {
  const a = '/runner/src/modules/a.service.ts';
  const b = '/runner/src/modules/frontend-errors/frontend-errors.service.ts';

  it('junta: linha coberta em qualquer shard conta', () => {
    const { total } = avaliar([arquivo(a, 10, 5), arquivo(a, 10, 0)], {
      global: { lines: 50 },
    });
    expect(total.lines.pct).toBe(50);
  });

  it('passa quando o global está no limite', () => {
    const { falhas } = avaliar([arquivo(a, 10, 8)], { global: { lines: 80 } });
    expect(falhas).toEqual([]);
  });

  it('falha abaixo do global, dizendo quanto', () => {
    const { falhas } = avaliar([arquivo(a, 10, 7)], { global: { lines: 74 } });
    expect(falhas).toEqual(['global: lines 70% < 74%']);
  });

  it('confere o limite por arquivo (chave relativa, mapa com caminho absoluto)', () => {
    const limites = {
      global: { lines: 0 },
      'src/modules/frontend-errors/frontend-errors.service.ts': { lines: 70 },
    };
    expect(
      avaliar([arquivo(a, 10, 10), arquivo(b, 10, 6)], limites).falhas,
    ).toEqual([
      'src/modules/frontend-errors/frontend-errors.service.ts: lines 60% < 70%',
    ]);
    expect(
      avaliar([arquivo(a, 10, 10), arquivo(b, 10, 7)], limites).falhas,
    ).toEqual([]);
  });

  it('arquivo do limite sem cobertura registrada é falha, não silêncio', () => {
    const { falhas } = avaliar([arquivo(a, 10, 10)], {
      'src/modules/frontend-errors/frontend-errors.service.ts': { lines: 70 },
    });
    expect(falhas).toEqual([
      'src/modules/frontend-errors/frontend-errors.service.ts: sem cobertura registrada',
    ]);
  });
});
