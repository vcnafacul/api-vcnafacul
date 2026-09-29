import { Permissions } from 'src/modules/role/permissions/permissions';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CursinhoProvaController } from './cursinho-prova.controller';

describe('CursinhoProvaController', () => {
  function make() {
    const provaService = {
      createProva: jest.fn().mockResolvedValue({ _id: 'p1' }),
      getAllByCursinho: jest.fn().mockResolvedValue({ data: [] }),
      duplicar: jest.fn().mockResolvedValue({ _id: 'p2' }),
    };
    const resolver = {
      resolveCursinhoIdByUserId: jest.fn().mockResolvedValue('curs-A'),
    };
    const atorService = {
      resolver: jest
        .fn()
        .mockResolvedValue({ userId: 'user-1', cursinhoId: 'curs-A' }),
    };
    const controller = new CursinhoProvaController(
      provaService as any,
      resolver as any,
      atorService as any,
    );
    return { controller, provaService, resolver, atorService };
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

  // ---- tickets/027, card 02 ----

  it('duplicar: repassa o id, o nome (sem espaços nas pontas) e o ator', async () => {
    const { controller, provaService, atorService } = make();
    const req = { user: { id: 'user-1' } } as any;

    await controller.duplicar('p1', { nome: '  Simulado Espanhol ' }, req);

    expect(atorService.resolver).toHaveBeenCalledWith('user-1');
    expect(provaService.duplicar).toHaveBeenCalledWith(
      'p1',
      'Simulado Espanhol',
      {
        userId: 'user-1',
        cursinhoId: 'curs-A',
      },
    );
  });

  it('duplicar exige cadastrarProvasCursinho, na rota', () => {
    expect(
      Reflect.getMetadata(
        PermissionsGuard.name,
        CursinhoProvaController.prototype.duplicar,
      ),
    ).toBe(Permissions.cadastrarProvasCursinho);
  });
});
