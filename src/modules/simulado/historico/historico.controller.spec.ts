import { HistoricoController } from './historico.controller';

const montar = () => {
  const service = {
    getById: jest.fn(),
    getAllByUser: jest.fn(),
    getPerformance: jest.fn(),
  };
  return { ctrl: new HistoricoController(service as any), service };
};

const req = (id: string) => ({ user: { id } }) as never;

describe('HistoricoController.getById', () => {
  it('⚠️ o dono vem do JWT, nunca de parâmetro', async () => {
    // Antes deste card o `req.user` nem era injetado: qualquer usuário
    // autenticado lia o histórico de qualquer outro pelo id.
    const { ctrl, service } = montar();

    await ctrl.getById('h1', req('u-dono'));

    expect(service.getById).toHaveBeenCalledWith('h1', 'u-dono');
  });

  it('⚠️ nada do caminho consegue trocar o dono', async () => {
    // um id que tenta se passar por outra coisa não muda o segundo argumento
    const { ctrl, service } = montar();

    await ctrl.getById('h1?usuario=alheio', req('u-dono'));

    expect(service.getById).toHaveBeenCalledWith('h1?usuario=alheio', 'u-dono');
  });
});
