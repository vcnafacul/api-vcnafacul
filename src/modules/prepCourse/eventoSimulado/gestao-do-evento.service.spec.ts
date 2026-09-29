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

  const montar = () => {
    const eventos = {
      findDoCursinho: jest.fn().mockResolvedValue([]),
      findUmDoCursinho: jest.fn(),
      inscritosPorProva: jest.fn().mockResolvedValue(new Map()),
      salvarComProvas: jest.fn().mockResolvedValue('e1'),
      excluir: jest.fn(),
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
      })),
    };
    const service = new GestaoDoEventoService(
      eventos as never,
      colaboradores as never,
      provas as never,
    );
    return { service, eventos, colaboradores };
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
});
