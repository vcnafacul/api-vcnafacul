import { ExameProxyService } from './exame.service';

describe('ExameProxyService', () => {
  it('getAll bate em v1/exame no ms', async () => {
    // ⚠️ O teste do controller só prova que ele delega. Um erro de digitação
    // na rota do ms passaria batido lá — quem trava o caminho é este.
    const mockAxios = { get: jest.fn() };
    const mockFactory = { create: jest.fn().mockReturnValue(mockAxios) };
    const mockEnv = { get: jest.fn().mockReturnValue('http://ms-simulado') };

    const service = new ExameProxyService(mockFactory as any, mockEnv as any);
    await service.getAll();

    expect(mockEnv.get).toHaveBeenCalledWith('SIMULADO_URL');
    expect(mockFactory.create).toHaveBeenCalledWith('http://ms-simulado');
    expect(mockAxios.get).toHaveBeenCalledWith('v1/exame');
  });
});
