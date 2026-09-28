import { Ator } from '../ator/ator';
import { QuestaoService } from './questao.service';

/**
 * As rotas que compõem prova levam o ator ao ms no header `x-ator`
 * (tickets/023, card 02) — e um `ator` no corpo do cliente não passa.
 */
describe('QuestaoService — o ator vai ao ms (023 · 02)', () => {
  const ator: Ator = {
    userId: 'u-jwt',
    cursinhoId: 'c1',
    admin: false,
    editorCursinho: true,
  };
  const forjado = { userId: 'x', cursinhoId: null, admin: true };

  function make() {
    const axios = {
      get: jest.fn().mockResolvedValue({}),
      post: jest.fn().mockResolvedValue({}),
      patch: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    };
    const service = new QuestaoService(
      {} as any,
      { create: () => axios } as any,
      { get: () => 'http://ms' } as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return { service, axios };
  }

  const header = (h: Record<string, string>) => JSON.parse(h['x-ator']);

  it('adicionarEmProva: corpo sem ator forjado, userId do JWT, header', async () => {
    const { service, axios } = make();
    await service.adicionarEmProva(
      'q1',
      { provaId: 'p1', numero: 3, ator: forjado, userId: 'x' } as any,
      ator,
    );
    const [url, corpo, h] = axios.post.mock.calls[0];
    expect(url).toBe('v1/questao/q1/provas');
    expect(corpo).toEqual({ provaId: 'p1', numero: 3, userId: 'u-jwt' });
    expect(header(h)).toEqual(ator);
  });

  it('removerDeProva: header', async () => {
    const { service, axios } = make();
    await service.removerDeProva('q1', 'p1', ator);
    const [url, h] = axios.delete.mock.calls[0];
    expect(url).toBe('v1/questao/q1/provas/p1?userId=u-jwt');
    expect(header(h)).toEqual(ator);
  });

  it('createQuestion: header, sem ator no corpo', async () => {
    const { service, axios } = make();
    await service.createQuestion({ prova: 'p1', ator: forjado }, ator);
    const [url, corpo, h] = axios.post.mock.calls[0];
    expect(url).toBe('v1/questao');
    expect(corpo).toEqual({ prova: 'p1' });
    expect(header(h)).toEqual(ator);
  });

  it('questoesUpdate: header, sem ator no corpo', async () => {
    const { service, axios } = make();
    await service.questoesUpdate({ _id: 'q1', ator: forjado }, ator);
    const [url, corpo, h] = axios.patch.mock.calls[0];
    expect(url).toBe('v1/questao');
    expect(corpo).toEqual({ _id: 'q1' });
    expect(header(h)).toEqual(ator);
  });

  it('updateClassificacao: header, sem ator no corpo', async () => {
    const { service, axios } = make();
    await service.updateClassificacao(
      'q1',
      { numero: 4, prova: 'p1', ator: forjado },
      ator,
    );
    const [url, corpo, h] = axios.patch.mock.calls[0];
    expect(url).toBe('v1/questao/q1/classification');
    expect(corpo).toEqual({ numero: 4, prova: 'p1' });
    expect(header(h)).toEqual(ator);
  });
});

describe('leituras com o ator e o nome do cursinho (023 · 07)', () => {
  const ator: Ator = {
    userId: 'u',
    cursinhoId: 'A',
    admin: false,
    editorCursinho: true,
  };
  const montar = (resposta: unknown) => {
    const axios = { get: jest.fn().mockResolvedValue(resposta) };
    const cursinhoNome = {
      comNome: jest.fn(async (ps: any[]) =>
        ps.map((p) => ({ ...p, cursinhoNome: 'X' })),
      ),
    };
    const service = new QuestaoService(
      {} as any,
      { create: () => axios } as any,
      { get: () => 'http://ms' } as any,
      {} as any,
      {} as any,
      {} as any,
      cursinhoNome as any,
    );
    return { service, axios, cursinhoNome };
  };

  it('getById: header do ator e nome em cada prova do provasContendo', async () => {
    const { service, axios } = montar({
      provasContendo: [{ provaId: 'p', cursinhoId: 'A' }],
    });
    const q = await service.getById('q1', ator);
    expect(JSON.parse(axios.get.mock.calls[0][1]['x-ator'])).toEqual(ator);
    expect(q.provasContendo[0].cursinhoNome).toBe('X');
  });

  it('getById sem ator: sem header', async () => {
    const { service, axios } = montar({ provasContendo: [] });
    await service.getById('q1');
    expect(axios.get.mock.calls[0][1]).toBeUndefined();
  });

  it('infos: header do ator e nome nas provas', async () => {
    const { service, axios } = montar({ provas: [{ cursinhoId: 'A' }] });
    const infos = await service.questoesInfo(ator);
    expect(axios.get.mock.calls[0][0]).toBe('v1/questao/infos');
    expect(JSON.parse(axios.get.mock.calls[0][1]['x-ator'])).toEqual(ator);
    expect(infos.provas[0].cursinhoNome).toBe('X');
  });
});
