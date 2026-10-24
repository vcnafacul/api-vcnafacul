import { presencaNaChamada, assiduidadeBase, JUSTIFICATIVAS } from './presenca';
import { reiniciarAleatorio } from './aleatorio';

const aluno = (o: Partial<Parameters<typeof presencaNaChamada>[0]> = {}) => ({
  matriculadoEm: new Date('2025-02-28T00:00:00Z'),
  saidaEm: null as Date | null,
  sumindoDesde: null as Date | null,
  assiduidade: 0.9,
  ...o,
});

describe('presencaNaChamada', () => {
  beforeEach(reiniciarAleatorio);

  it('não lista o aluno antes da matrícula nem depois da saída', () => {
    const a = aluno({ saidaEm: new Date('2025-06-01T00:00:00Z') });
    expect(presencaNaChamada(a, new Date('2025-02-27T00:00:00Z'))).toBeNull();
    expect(presencaNaChamada(a, new Date('2025-06-02T00:00:00Z'))).toBeNull();
    expect(
      presencaNaChamada(a, new Date('2025-05-01T00:00:00Z')),
    ).not.toBeNull();
  });

  it('sumindo: falta sem justificativa em toda chamada a partir de sumindoDesde', () => {
    const a = aluno({
      sumindoDesde: new Date('2025-05-10T00:00:00Z'),
      saidaEm: new Date('2025-06-01T00:00:00Z'),
    });
    const r = presencaNaChamada(a, new Date('2025-05-15T00:00:00Z'))!;
    expect(r.presente).toBe(false);
    expect(r.justificativa).toBeNull();
  });

  it('a assiduidade vira a taxa de presença aproximada', () => {
    const a = aluno({ assiduidade: 0.9 });
    let presentes = 0;
    for (let i = 0; i < 1000; i++)
      if (presencaNaChamada(a, new Date('2025-05-01T00:00:00Z'))!.presente)
        presentes++;
    expect(presentes).toBeGreaterThan(860);
    expect(presentes).toBeLessThan(940);
  });

  it('justificativa só em falta e sempre da lista', () => {
    for (let i = 0; i < 500; i++) {
      const r = presencaNaChamada(
        aluno({ assiduidade: 0.5 }),
        new Date('2025-05-01T00:00:00Z'),
      )!;
      if (r.presente) expect(r.justificativa).toBeNull();
      else if (r.justificativa)
        expect(JUSTIFICATIVAS).toContain(r.justificativa);
    }
  });

  it('assiduidadeBase fica entre 0,75 e 0,98', () => {
    for (let i = 0; i < 200; i++) {
      const v = assiduidadeBase();
      expect(v).toBeGreaterThanOrEqual(0.75);
      expect(v).toBeLessThanOrEqual(0.98);
    }
  });
});
