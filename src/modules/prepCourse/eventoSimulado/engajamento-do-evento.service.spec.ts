import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { EngajamentoDoEventoService } from './engajamento-do-evento.service';

describe('EngajamentoDoEventoService (026 · 05)', () => {
  /**
   * tickets/039: os simulados de cada prova vêm do `SimuladosDasProvasService`.
   * Por padrão, um por prova (`sim-<prova>`); a `p-dia1` tem dois.
   */
  const SIMS: Record<string, { simuladoId: string; nome: string }[]> = {
    'p-dia1': [
      { simuladoId: 's-ing', nome: 'Dia 1 Inglês' },
      { simuladoId: 's-esp', nome: 'Dia 1 Espanhol' },
    ],
  };
  const montar = (
    participantes: Record<string, string[]> | Error,
    {
      provas = [
        { provaId: 'p-en', nomeDaProva: 'Inglês' },
        { provaId: 'p-es', nomeDaProva: 'Espanhol' },
      ],
      inscricoes = [
        { userId: 'ana', provaId: 'p-en', simuladoId: null },
        { userId: 'beto', provaId: 'p-en', simuladoId: null },
        { userId: 'caio', provaId: 'p-es', simuladoId: null },
      ] as { userId: string; provaId: string; simuladoId: string | null }[],
    } = {},
  ) => {
    const eventos = {
      findUmDoCursinho: jest.fn().mockResolvedValue({
        id: 'e1',
        inscricoesDe: new Date('2026-10-01T00:00:00Z'),
        provas,
      }),
      inscricoesDoEvento: jest.fn().mockResolvedValue(inscricoes),
      nomesDosUsuarios: jest.fn(
        async (ids: string[]) => new Map(ids.map((i) => [i, i.toUpperCase()])),
      ),
    };
    const gestao = { cursinhoDoColaborador: jest.fn().mockResolvedValue('A') };
    const ms = {
      participantesPorCartao:
        participantes instanceof Error
          ? jest.fn().mockRejectedValue(participantes)
          : jest.fn().mockResolvedValue(participantes),
    };
    const simulados = {
      dasProvas: jest.fn(
        async (ps: { provaId: string; nomeDaProva: string }[]) =>
          new Map(
            ps.map((p) => [
              p.provaId,
              SIMS[p.provaId] ?? [
                { simuladoId: `sim-${p.provaId}`, nome: p.nomeDaProva },
              ],
            ]),
          ),
      ),
    };
    return {
      service: new EngajamentoDoEventoService(
        eventos as never,
        gestao as never,
        ms as never,
        simulados as never,
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
        trocaram: 0,
        naoVieram: 1,
        semSimulado: 0,
        simulados: [
          {
            simuladoId: 'sim-p-en',
            nome: 'Inglês',
            inscritos: 2,
            fizeram: 1,
            trocaram: 0,
            naoVieram: 1,
          },
        ],
      },
      {
        provaId: 'p-es',
        nome: 'Espanhol',
        inscritos: 1,
        fizeram: 1,
        trocaram: 0,
        naoVieram: 0,
        semSimulado: 0,
        simulados: [
          {
            simuladoId: 'sim-p-es',
            nome: 'Espanhol',
            inscritos: 1,
            fizeram: 1,
            trocaram: 0,
            naoVieram: 0,
          },
        ],
      },
    ]);
    expect(r).toMatchObject({ totalInscritos: 3, inscritosQueFizeram: 2 });
    expect(r.engajamento).toBeCloseTo(2 / 3);
    expect(r.inscritos).toEqual([
      {
        nome: 'ANA',
        provaId: 'p-en',
        simuladoId: 'sim-p-en',
        fez: true,
        provaQueFez: 'p-en',
        simuladoQueFez: 'sim-p-en',
      },
      {
        nome: 'BETO',
        provaId: 'p-en',
        simuladoId: 'sim-p-en',
        fez: false,
        provaQueFez: null,
        simuladoQueFez: null,
      },
      {
        nome: 'CAIO',
        provaId: 'p-es',
        simuladoId: 'sim-p-es',
        fez: true,
        provaQueFez: 'p-es',
        simuladoQueFez: 'sim-p-es',
      },
    ]);
    expect(r.fizeramSemInscricao).toEqual([
      { nome: 'DANI', provaId: 'p-en', simuladoId: 'sim-p-en' },
    ]);
  });

  it('⚠️ inscrito que fez a OUTRA prova: conta no engajamento e na linha da prova que FEZ (card 38)', async () => {
    const { service } = montar({ 'sim-p-en': [], 'sim-p-es': ['beto'] });
    const r = await service.doEvento('u1', 'e1');

    expect(r.inscritos.find((i) => i.nome === 'BETO')).toMatchObject({
      provaId: 'p-en',
      fez: true,
      provaQueFez: 'p-es',
    });
    // Inglês: beto trocou, ana não veio. Espanhol: beto fez lá.
    expect(r.porProva).toEqual([
      expect.objectContaining({
        provaId: 'p-en',
        inscritos: 2,
        fizeram: 0,
        trocaram: 1,
        naoVieram: 1,
      }),
      expect.objectContaining({
        provaId: 'p-es',
        inscritos: 1,
        fizeram: 1,
        trocaram: 0,
        naoVieram: 1,
      }),
    ]);
    expect(r.inscritosQueFizeram).toBe(1);
    expect(r.fizeramSemInscricao).toEqual([]);
  });

  describe('tickets/039: prova com dois simulados (Enem Dia 1)', () => {
    const dia1 = { provas: [{ provaId: 'p-dia1', nomeDaProva: 'Dia 1' }] };

    it('⚠️ quem fez Espanhol conta em "Fizeram" (antes: "Não veio")', async () => {
      const { service, ms } = montar(
        { 's-ing': ['ana'], 's-esp': ['caio'] },
        {
          ...dia1,
          inscricoes: [
            { userId: 'ana', provaId: 'p-dia1', simuladoId: 's-ing' },
            { userId: 'caio', provaId: 'p-dia1', simuladoId: 's-esp' },
          ],
        },
      );
      const r = await service.doEvento('u1', 'e1');
      expect(ms.participantesPorCartao).toHaveBeenCalledWith(
        ['s-ing', 's-esp'],
        expect.any(Date),
      );
      const [prova] = r.porProva;
      expect(prova).toMatchObject({
        inscritos: 2,
        fizeram: 2,
        trocaram: 0,
        naoVieram: 0,
      });
      expect(prova.simulados).toEqual([
        {
          simuladoId: 's-ing',
          nome: 'Dia 1 Inglês',
          inscritos: 1,
          fizeram: 1,
          trocaram: 0,
          naoVieram: 0,
        },
        {
          simuladoId: 's-esp',
          nome: 'Dia 1 Espanhol',
          inscritos: 1,
          fizeram: 1,
          trocaram: 0,
          naoVieram: 0,
        },
      ]);
      expect(r.engajamento).toBe(1);
    });

    it('inscrito em Inglês que fez Espanhol: trocou; o total da prova é a soma', async () => {
      const { service } = montar(
        { 's-ing': [], 's-esp': ['ana'] },
        {
          ...dia1,
          inscricoes: [
            { userId: 'ana', provaId: 'p-dia1', simuladoId: 's-ing' },
            { userId: 'beto', provaId: 'p-dia1', simuladoId: 's-esp' },
          ],
        },
      );
      const [prova] = (await service.doEvento('u1', 'e1')).porProva;
      expect(prova.simulados[0]).toMatchObject({
        inscritos: 1,
        fizeram: 0,
        trocaram: 1,
        naoVieram: 0,
      });
      expect(prova.simulados[1]).toMatchObject({
        inscritos: 1,
        fizeram: 1,
        trocaram: 0,
        naoVieram: 1,
      });
      expect(prova).toMatchObject({
        inscritos: 2,
        fizeram: 1,
        trocaram: 1,
        naoVieram: 1,
      });
    });

    it('inscrição de antes, sem língua: só no total da prova (semSimulado)', async () => {
      const { service } = montar(
        { 's-ing': [], 's-esp': [] },
        {
          ...dia1,
          inscricoes: [{ userId: 'ana', provaId: 'p-dia1', simuladoId: null }],
        },
      );
      const [prova] = (await service.doEvento('u1', 'e1')).porProva;
      expect(prova).toMatchObject({
        inscritos: 1,
        naoVieram: 1,
        semSimulado: 1,
      });
      expect(prova.simulados.map((s) => s.inscritos)).toEqual([0, 0]);
    });
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
