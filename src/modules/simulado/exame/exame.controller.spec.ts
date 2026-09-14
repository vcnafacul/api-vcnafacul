import { ExameProxyController } from './exame.controller';

describe('ExameProxyController', () => {
  it('lista os exames pelo ms', async () => {
    const service = {
      getAll: jest.fn().mockResolvedValue({ data: [{ nome: 'ENEM' }] }),
    };
    const controller = new ExameProxyController(service as never);

    const r = await controller.getAll();

    expect(service.getAll).toHaveBeenCalled();
    expect(r).toEqual({ data: [{ nome: 'ENEM' }] });
  });
});
