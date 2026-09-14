import { CategoriaProxyService } from './categoria.service';

describe('CategoriaProxyService', () => {
  let service: CategoriaProxyService;
  let mockAxios: { get: jest.Mock; post: jest.Mock; delete: jest.Mock };

  beforeEach(() => {
    mockAxios = { get: jest.fn(), post: jest.fn(), delete: jest.fn() };
    const mockFactory = { create: jest.fn().mockReturnValue(mockAxios) };
    const mockEnv = { get: jest.fn().mockReturnValue('http://ms-simulado') };
    service = new CategoriaProxyService(mockFactory as any, mockEnv as any);
  });

  it('getAll encaminha page, limit e dono', async () => {
    await service.getAll(1, 0, 'system');
    // ⚠️ `limit=0` tem de sobreviver: o fluxo admin manda esse valor, e um
    // `if (limit)` simples o descartaria por ser falsy.
    expect(mockAxios.get).toHaveBeenCalledWith(
      'v1/categoria?page=1&limit=0&dono=system',
    );
  });

  it('getAll omite page/limit ausentes, mas nunca o dono', async () => {
    // ⚠️ Ausente tem de ficar ausente na URL: interpolado, viraria a string
    // "undefined" e o ms leria isso como paginação inválida.
    await service.getAll(undefined, undefined, 'cur-1');
    expect(mockAxios.get).toHaveBeenCalledWith('v1/categoria?dono=cur-1');
  });

  it('getById encaminha o id', async () => {
    await service.getById('cat-1');
    expect(mockAxios.get).toHaveBeenCalledWith('v1/categoria/cat-1');
  });

  it('create manda o dono no header x-dono, não no corpo', async () => {
    const dto = { nome: 'Custom 10q 30min', duracao: 30, exame: 'e1' } as any;
    await service.create(dto, 'cur-1');
    expect(mockAxios.post).toHaveBeenCalledWith('v1/categoria', dto, {
      'x-dono': 'cur-1',
    });
    // O corpo repassado continua sendo só o do cliente.
    expect(mockAxios.post.mock.calls[0][1]).not.toHaveProperty('dono');
  });

  it('delete manda o dono no header x-dono', async () => {
    await service.delete('cat-1', 'cur-1');
    expect(mockAxios.delete).toHaveBeenCalledWith('v1/categoria/cat-1', {
      'x-dono': 'cur-1',
    });
  });
});
