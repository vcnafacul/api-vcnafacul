import { SimuladoService } from './simulado.service';

describe('SimuladoService.updateDisponibilidade (proxy)', () => {
  let service: SimuladoService;
  let mockAxios: { patch: jest.Mock };

  beforeEach(() => {
    mockAxios = {
      patch: jest.fn().mockResolvedValue({ _id: 's1', disponivelDe: null }),
    };
    const mockFactory = { create: jest.fn().mockReturnValue(mockAxios) };
    const mockEnv = { get: jest.fn().mockReturnValue('http://ms') };
    service = new SimuladoService(
      mockFactory as any,
      mockEnv as any,
      {} as any, // auditLog
      {} as any, // cache
    );
  });

  it('faz PATCH em v1/simulado/:id/disponibilidade com o dto', async () => {
    const dto = { disponivelAte: new Date('2026-01-20T00:00:00.000Z') } as any;

    await service.updateDisponibilidade('sim-1', dto);

    expect(mockAxios.patch).toHaveBeenCalledWith(
      'v1/simulado/sim-1/disponibilidade',
      dto,
    );
  });

  it('retorna o que o ms-simulado devolve', async () => {
    const result = await service.updateDisponibilidade('sim-1', {} as any);
    expect(result).toEqual({ _id: 's1', disponivelDe: null });
  });
});
