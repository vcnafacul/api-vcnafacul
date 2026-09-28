import { CursinhoNomeService } from './cursinho-nome.service';

describe('CursinhoNomeService (023 · 07)', () => {
  const montar = () => {
    const partners = {
      nomesPorId: jest.fn(
        async (ids: string[]) =>
          new Map(ids.map((id) => [id, `Cursinho ${id}`])),
      ),
    };
    return { service: new CursinhoNomeService(partners as never), partners };
  };

  it('⚠️ uma consulta só para a lista, sem repetir id (sem N+1)', async () => {
    const { service, partners } = montar();
    const lista: { cursinhoId: string | null; cursinhoNome?: string }[] = [
      { cursinhoId: 'A' },
      { cursinhoId: 'B' },
      { cursinhoId: 'A' },
      { cursinhoId: null },
    ];
    const out = await service.comNome(lista);
    expect(partners.nomesPorId).toHaveBeenCalledTimes(1);
    expect(partners.nomesPorId).toHaveBeenCalledWith(['A', 'B']);
    expect(out.map((p) => p.cursinhoNome)).toEqual([
      'Cursinho A',
      'Cursinho B',
      'Cursinho A',
      undefined,
    ]);
  });

  it('prova da plataforma fica como veio', async () => {
    const { service } = montar();
    const p = { cursinhoId: null, nome: 'Enem' };
    expect((await service.comNome([p]))[0]).toBe(p);
  });
});
