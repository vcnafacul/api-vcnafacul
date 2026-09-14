import { CursinhoCategoriaController } from './cursinho-categoria.controller';

describe('CursinhoCategoriaController', () => {
  const categoriaService = {
    getAll: jest.fn().mockResolvedValue({ data: [] }),
    create: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const cursinhoResolver = {
    resolveCursinhoIdByUserId: jest.fn().mockResolvedValue('cur-1'),
  };
  const controller = new CursinhoCategoriaController(
    categoriaService as never,
    cursinhoResolver as never,
  );
  const req = { user: { id: 'u1' } } as never;

  beforeEach(() => jest.clearAllMocks());

  it('GET lista só as do cursinho resolvido pelo JWT', async () => {
    await controller.getAll(req, '1', '40');
    expect(cursinhoResolver.resolveCursinhoIdByUserId).toHaveBeenCalledWith(
      'u1',
    );
    expect(categoriaService.getAll).toHaveBeenCalledWith('1', '40', 'cur-1');
  });

  it('POST injeta o dono resolvido, ignorando o corpo', async () => {
    /**
     * ⚠️ A garantia de isolamento, no mesmo molde do cursinho-prova.controller:
     * o cliente não decide de quem é o registro.
     */
    await controller.create({ nome: 'Enem Dia 1', dono: 'HACK' } as never, req);
    expect(categoriaService.create).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Enem Dia 1' }),
      'cur-1',
    );
  });

  it('DELETE passa o dono, para o ms recusar categoria alheia', async () => {
    await controller.delete('cat-9', req);
    expect(categoriaService.delete).toHaveBeenCalledWith('cat-9', 'cur-1');
  });
});
