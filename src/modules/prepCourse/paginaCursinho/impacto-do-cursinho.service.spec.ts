import { ImpactoDoCursinhoService } from './impacto-do-cursinho.service';

describe('ImpactoDoCursinhoService (025 · 03)', () => {
  const montar = (msGet: jest.Mock) => {
    const students = {
      countStudentsEffectivelyServed: jest.fn().mockResolvedValue(40),
      countStudentsCurrentlyEnrolled: jest.fn().mockResolvedValue(12),
    };
    const inscricoes = { getTotalNonTest: jest.fn().mockResolvedValue(3) };
    const cache = { wrap: jest.fn((_k, fn) => fn()) };
    const factory = { create: jest.fn(() => ({ get: msGet })) };
    const env = { get: jest.fn(() => 'http://ms') };
    const service = new ImpactoDoCursinhoService(
      students as never,
      inscricoes as never,
      cache as never,
      factory as never,
      env as never,
    );
    return { service, students, inscricoes, cache };
  };

  it('junta os 4 números, todos filtrados pelo cursinho', async () => {
    const msGet = jest.fn().mockResolvedValue({ questoesAprovadas: 9 });
    const { service, students, inscricoes, cache } = montar(msGet);

    await expect(service.numeros('A')).resolves.toEqual({
      estudantesAtendidos: 40,
      estudantesAtivos: 12,
      questoesAprovadas: 9,
      processosSeletivos: 3,
    });
    expect(students.countStudentsEffectivelyServed).toHaveBeenCalledWith('A');
    expect(students.countStudentsCurrentlyEnrolled).toHaveBeenCalledWith('A');
    expect(inscricoes.getTotalNonTest).toHaveBeenCalledWith('A');
    expect(msGet).toHaveBeenCalledWith('v1/questao/contador-cursinho/A');
    expect(cache.wrap.mock.calls[0][0]).toBe('cursinho:impacto:A');
  });

  it('ms fora do ar → questoesAprovadas null, o resto responde', async () => {
    const { service } = montar(
      jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    );
    await expect(service.numeros('A')).resolves.toMatchObject({
      questoesAprovadas: null,
      estudantesAtendidos: 40,
    });
  });
});
