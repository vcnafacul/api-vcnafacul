import { CursinhoProvaController } from './cursinho-prova.controller';

describe('CursinhoProvaController', () => {
  function make() {
    const provaService = {
      createProva: jest.fn().mockResolvedValue({ _id: 'p1' }),
      getAllByCursinho: jest.fn().mockResolvedValue({ data: [] }),
    };
    const resolver = {
      resolveCursinhoIdByUserId: jest.fn().mockResolvedValue('curs-A'),
    };
    const controller = new CursinhoProvaController(
      provaService as any,
      resolver as any,
    );
    return { controller, provaService, resolver };
  }

  it('POST injeta criadorId+cursinhoId resolvidos, ignorando o body', async () => {
    const { controller, provaService, resolver } = make();
    const req = { user: { id: 'user-1' } } as any;
    const files = { file: [{ name: 'f' }], gabarito: undefined } as any;
    const dto = { nome: 'X', criadorId: 'HACK', cursinhoId: 'HACK' } as any;

    await controller.create(dto, files, req);

    expect(resolver.resolveCursinhoIdByUserId).toHaveBeenCalledWith('user-1');
    expect(provaService.createProva).toHaveBeenCalledWith(
      dto,
      { name: 'f' },
      undefined,
      'user-1',
      'curs-A',
    );
  });

  it('GET resolve cursinhoId e encaminha page/limit', async () => {
    const { controller, provaService, resolver } = make();
    const req = { user: { id: 'user-1' } } as any;

    await controller.getAll('2', '10', req);

    expect(resolver.resolveCursinhoIdByUserId).toHaveBeenCalledWith('user-1');
    expect(provaService.getAllByCursinho).toHaveBeenCalledWith(
      'curs-A',
      '2',
      '10',
    );
  });
});
