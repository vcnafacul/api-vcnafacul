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

  it('getAll encaminha page e limit', async () => {
    await service.getAll(1, 0);
    expect(mockAxios.get).toHaveBeenCalledWith('v1/categoria?page=1&limit=0');
  });

  it('getById encaminha o id', async () => {
    await service.getById('cat-1');
    expect(mockAxios.get).toHaveBeenCalledWith('v1/categoria/cat-1');
  });

  it('create faz POST em v1/categoria com o body', async () => {
    const dto = { nome: 'Custom 10q 30min', duracao: 30, exame: 'e1' } as any;
    await service.create(dto);
    expect(mockAxios.post).toHaveBeenCalledWith('v1/categoria', dto);
  });

  it('delete faz DELETE em v1/categoria/:id', async () => {
    await service.delete('cat-1');
    expect(mockAxios.delete).toHaveBeenCalledWith('v1/categoria/cat-1');
  });
});
