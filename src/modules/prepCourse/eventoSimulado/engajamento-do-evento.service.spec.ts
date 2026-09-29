import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { EngajamentoDoEventoService } from './engajamento-do-evento.service';

describe('EngajamentoDoEventoService (026 · 05)', () => {
  const montar = (participantes: Record<string, string[]> | Error) => {
    const eventos = {
      findUmDoCursinho: jest.fn().mockResolvedValue({
        id: 'e1',
        inscricoesDe: new Date('2026-10-01T00:00:00Z'),
        provas: [
          { provaId: 'p-en', nomeDaProva: 'Inglês' },
          { provaId: 'p-es', nomeDaProva: 'Espanhol' },
        ],
      }),
      inscricoesDoEvento: jest.fn().mockResolvedValue([
        { userId: 'ana', provaId: 'p-en' },
        { userId: 'beto', provaId: 'p-en' },
        { userId: 'caio', provaId: 'p-es' },
      ]),
      nomesDosUsuarios: jest.fn(
        async (ids: string[]) => new Map(ids.map((i) => [i, i.toUpperCase()])),
      ),
    };
    const gestao = { cursinhoDoColaborador: jest.fn().mockResolvedValue('A') };
    const ms = {
      buscar: jest.fn(async (id: string) => ({ simuladoIds: [`sim-${id}`] })),
      participantesPorCartao:
        participantes instanceof Error
          ? jest.fn().mockRejectedValue(participantes)
          : jest.fn().mockResolvedValue(participantes),
    };
    return {
      service: new EngajamentoDoEventoService(
        eventos as never,
        gestao as never,
        ms as never,
      ),
      eventos,
      ms,
    };
  };

  it('por prova, engajamento, lista e quem fez sem se inscrever', async () => {
    const { service, ms } = montar({
      'sim-p-en': ['ana', 'dani'], // dani fez sem se inscrever
      'sim-p-es': ['caio'],
    });
    const r = await service.doEvento('u1', 'e1');

    expect(ms.participantesPorCartao).toHaveBeenCalledWith(
      ['sim-p-en', 'sim-p-es'],
      new Date('2026-10-01T00:00:00Z'),
    );
    expect(r.porProva).toEqual([
      {
        provaId: 'p-en',
        nome: 'Inglês',
        inscritos: 2,
        fizeram: 1,
        naoVieram: 1,
      },
      {
        provaId: 'p-es',
        nome: 'Espanhol',
        inscritos: 1,
        fizeram: 1,
        naoVieram: 0,
      },
    ]);
    expect(r).toMatchObject({ totalInscritos: 3, inscritosQueFizeram: 2 });
    expect(r.engajamento).toBeCloseTo(2 / 3);
    expect(r.inscritos).toEqual([
      { nome: 'ANA', provaId: 'p-en', fez: true },
      { nome: 'BETO', provaId: 'p-en', fez: false },
      { nome: 'CAIO', provaId: 'p-es', fez: true },
    ]);
    expect(r.fizeramSemInscricao).toEqual([{ nome: 'DANI', provaId: 'p-en' }]);
  });

  it('inscrito que fez a OUTRA prova do evento conta como fez', async () => {
    const { service } = montar({ 'sim-p-en': [], 'sim-p-es': ['beto'] });
    const r = await service.doEvento('u1', 'e1');
    expect(r.inscritos.find((i) => i.nome === 'BETO')?.fez).toBe(true);
    expect(r.fizeramSemInscricao).toEqual([]);
  });

  it('sem inscritos → engajamento null', async () => {
    const { service, eventos } = montar({});
    eventos.inscricoesDoEvento.mockResolvedValue([]);
    expect((await service.doEvento('u1', 'e1')).engajamento).toBeNull();
  });

  it('evento de outro cursinho → 404; ms fora → 503', async () => {
    const a = montar({});
    a.eventos.findUmDoCursinho.mockResolvedValue(null);
    await expect(a.service.doEvento('u1', 'e9')).rejects.toThrow(
      NotFoundException,
    );
    const b = montar(new Error('ECONNREFUSED'));
    await expect(b.service.doEvento('u1', 'e1')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
