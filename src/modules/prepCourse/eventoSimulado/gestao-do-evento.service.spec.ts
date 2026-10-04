import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GestaoDoEventoService } from './gestao-do-evento.service';

describe('GestaoDoEventoService (026 · 02)', () => {
  const P1 = '64b000000000000000000001';
  const P2 = '64b000000000000000000002';
  const DE_OUTRO = '64b000000000000000000009';
  const INCOMPLETA = '64b000000000000000000008';

  const montar = () => {
    const eventos = {
      findDoCursinho: jest.fn().mockResolvedValue([]),
      findUmDoCursinho: jest.fn(),
      inscritosPorProva: jest.fn().mockResolvedValue(new Map()),
      salvarComProvas: jest.fn().mockResolvedValue('e1'),
      excluir: jest.fn(),
      inscricoesDoEvento: jest.fn().mockResolvedValue([]),
    };
    const colaboradores = {
      findOneByUserId: jest
        .fn()
        .mockResolvedValue({ actived: true, partnerPrepCourse: { id: 'A' } }),
    };
    const provas = {
      buscar: jest.fn(async (id: string) => ({
        id,
        nome: id === P1 ? 'Simulado Inglês' : 'Simulado Espanhol',
        cursinhoId: id === DE_OUTRO ? 'B' : 'A',
        simuladoIds: [],
        completa: id !== INCOMPLETA,
      })),
    };
    const pushDoEvento = { avisarCancelamento: jest.fn() };
    const service = new GestaoDoEventoService(
      eventos as never,
      colaboradores as never,
      provas as never,
      pushDoEvento as never,
    );
    return { service, eventos, colaboradores, pushDoEvento };
  };

  const dto = (over = {}) => ({
    nome: ' Simulado de outubro ',
    descricao: 'Sábado, 8h, na escola',
    inscricoesDe: '2026-10-01T00:00:00Z',
    inscricoesAte: '2026-10-10T00:00:00Z',
    provaIds: [P1, P2],
    ...over,
  });

  it('cria no cursinho do colaborador, com o nome das provas', async () => {
    const { service, eventos } = montar();
    eventos.findUmDoCursinho.mockResolvedValue({
      id: 'e1',
      provas: [],
      inscricoesDe: new Date(),
      inscricoesAte: new Date(),
    });
    await service.criar('u1', dto());
    const [evento, provas] = eventos.salvarComProvas.mock.calls[0];
    expect(evento).toMatchObject({
      partnerPrepCourseId: 'A',
      nome: 'Simulado de outubro',
    });
    expect(provas).toEqual([
      { provaId: P1, nomeDaProva: 'Simulado Inglês' },
      { provaId: P2, nomeDaProva: 'Simulado Espanhol' },
    ]);
  });

  it('janela invertida → 400; prova de outro cursinho → 400; nada gravado', async () => {
    const { service, eventos } = montar();
    await expect(
      service.criar('u1', dto({ inscricoesAte: '2026-09-01T00:00:00Z' })),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.criar('u1', dto({ provaIds: [P1, DE_OUTRO] })),
    ).rejects.toThrow('Só dá para usar provas do seu cursinho');
    expect(eventos.salvarComProvas).not.toHaveBeenCalled();
  });

  it('sem colaborador ativo → 403', async () => {
    const { service, colaboradores } = montar();
    colaboradores.findOneByUserId.mockResolvedValue({
      actived: false,
      partnerPrepCourse: { id: 'A' },
    });
    await expect(service.listar('u1')).rejects.toThrow(ForbiddenException);
  });

  it('evento de outro cursinho → 404 ao editar e excluir', async () => {
    const { service, eventos } = montar();
    eventos.findUmDoCursinho.mockResolvedValue(null);
    await expect(service.editar('u1', 'e9', dto())).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.excluir('u1', 'e9')).rejects.toThrow(
      NotFoundException,
    );
    expect(eventos.findUmDoCursinho).toHaveBeenCalledWith('e9', 'A');
  });

  it('⚠️ tirar prova com inscritos → 409; sem inscritos → ok', async () => {
    const { service, eventos } = montar();
    eventos.findUmDoCursinho.mockResolvedValue({
      id: 'e1',
      inscricoesDe: new Date(),
      inscricoesAte: new Date(),
      provas: [
        { provaId: P1, nomeDaProva: 'Simulado Inglês' },
        { provaId: P2, nomeDaProva: 'Simulado Espanhol' },
      ],
    });
    eventos.inscritosPorProva.mockResolvedValue(
      new Map([['e1', new Map([[P2, 3]])]]),
    );
    await expect(
      service.editar('u1', 'e1', dto({ provaIds: [P1] })),
    ).rejects.toThrow(ConflictException);
    await expect(
      service.editar('u1', 'e1', dto({ provaIds: [P2] })),
    ).resolves.toBeDefined();
  });

  it('listar devolve status e inscritos por prova', async () => {
    const { service, eventos } = montar();
    eventos.findDoCursinho.mockResolvedValue([
      {
        id: 'e1',
        nome: 'Ev',
        descricao: null,
        inscricoesDe: new Date(Date.now() - 1000),
        inscricoesAte: new Date(Date.now() + 100000),
        provas: [{ provaId: P1, nomeDaProva: 'Simulado Inglês' }],
      },
    ]);
    eventos.inscritosPorProva.mockResolvedValue(
      new Map([['e1', new Map([[P1, 4]])]]),
    );
    const [e] = await service.listar('u1');
    expect(e).toMatchObject({
      status: 'aberto',
      totalInscritos: 4,
      provas: [{ provaId: P1, nome: 'Simulado Inglês', inscritos: 4 }],
    });
  });

  describe('card 38', () => {
    const atualCom = (provaIds: string[], fim = Date.now() + 100000) => ({
      id: 'e1',
      nome: 'Simulado de outubro',
      inscricoesDe: new Date(Date.now() - 1000),
      inscricoesAte: new Date(fim),
      provas: provaIds.map((provaId) => ({ provaId, nomeDaProva: provaId })),
    });

    it('⚠️ prova incompleta NOVA no evento → 400, nada gravado', async () => {
      const { service, eventos } = montar();
      await expect(
        service.criar('u1', dto({ provaIds: [P1, INCOMPLETA] })),
      ).rejects.toThrow('Só dá para usar provas completas.');
      eventos.findUmDoCursinho.mockResolvedValue(atualCom([P1]));
      await expect(
        service.editar('u1', 'e1', dto({ provaIds: [P1, INCOMPLETA] })),
      ).rejects.toThrow(BadRequestException);
      expect(eventos.salvarComProvas).not.toHaveBeenCalled();
    });

    it('⚠️ prova que JÁ estava no evento e deixou de estar completa não trava a edição', async () => {
      const { service, eventos } = montar();
      eventos.findUmDoCursinho.mockResolvedValue(atualCom([P1, INCOMPLETA]));
      await expect(
        service.editar('u1', 'e1', dto({ provaIds: [P1, INCOMPLETA] })),
      ).resolves.toBeDefined();
    });

    it('excluir com inscritos avisa cada um (depois de excluir)', async () => {
      const { service, eventos, pushDoEvento } = montar();
      eventos.findUmDoCursinho.mockResolvedValue(atualCom([P1]));
      eventos.inscricoesDoEvento.mockResolvedValue([
        { userId: 'ana', provaId: P1 },
        { userId: 'beto', provaId: P1 },
      ]);

      await service.excluir('u1', 'e1');

      expect(eventos.excluir).toHaveBeenCalledWith('e1');
      expect(pushDoEvento.avisarCancelamento).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'e1', nome: 'Simulado de outubro' }),
        ['ana', 'beto'],
      );
    });

    it('⚠️ evento ENCERRADO ou sem inscritos: exclui sem avisar', async () => {
      const { service, eventos, pushDoEvento } = montar();
      eventos.findUmDoCursinho.mockResolvedValue(
        atualCom([P1], Date.now() - 500),
      );
      eventos.inscricoesDoEvento.mockResolvedValue([
        { userId: 'ana', provaId: P1 },
      ]);
      await service.excluir('u1', 'e1');

      eventos.findUmDoCursinho.mockResolvedValue(atualCom([P1]));
      eventos.inscricoesDoEvento.mockResolvedValue([]);
      await service.excluir('u1', 'e1');

      expect(eventos.excluir).toHaveBeenCalledTimes(2);
      expect(pushDoEvento.avisarCancelamento).not.toHaveBeenCalled();
    });
  });
});
