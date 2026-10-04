import { Permissions } from 'src/modules/role/permissions/permissions';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { CursinhoProvaController } from './cursinho-prova.controller';

describe('CursinhoProvaController', () => {
  function make() {
    const provaService = {
      createProva: jest.fn().mockResolvedValue({ _id: 'p1' }),
      getAllByCursinho: jest.fn().mockResolvedValue({ data: [] }),
      duplicar: jest.fn().mockResolvedValue({ _id: 'p2' }),
      editarDados: jest.fn().mockResolvedValue({ nome: 'Simulado novo' }),
      excluir: jest.fn().mockResolvedValue({ nome: 'teste' }),
    };
    const resolver = {
      resolveCursinhoIdByUserId: jest.fn().mockResolvedValue('curs-A'),
    };
    const atorService = {
      resolver: jest
        .fn()
        .mockResolvedValue({ userId: 'user-1', cursinhoId: 'curs-A' }),
    };
    const provaNosEventos = {
      eventosComProva: jest.fn().mockResolvedValue([]),
      renomearProva: jest.fn(),
    };
    const controller = new CursinhoProvaController(
      provaService as any,
      resolver as any,
      atorService as any,
      provaNosEventos as any,
    );
    return { controller, provaService, resolver, atorService, provaNosEventos };
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

  // ---- card 41 ----

  describe('editar e excluir (card 41)', () => {
    const req = { user: { id: 'user-1' } } as any;

    it('editar: repassa os dados e o ator; com nome, renomeia nos eventos', async () => {
      const { controller, provaService, provaNosEventos } = make();

      const r = await controller.editarDados(
        'p1',
        { nome: 'Simulado novo', ano: 2026 },
        req,
      );

      expect(r).toEqual({ nome: 'Simulado novo' });
      expect(provaService.editarDados).toHaveBeenCalledWith(
        'p1',
        { nome: 'Simulado novo', ano: 2026 },
        { userId: 'user-1', cursinhoId: 'curs-A' },
      );
      expect(provaNosEventos.renomearProva).toHaveBeenCalledWith(
        'p1',
        'Simulado novo',
      );
    });

    it('editar sem nome não mexe nos eventos', async () => {
      const { controller, provaNosEventos } = make();
      await controller.editarDados('p1', { ano: 2026 }, req);
      expect(provaNosEventos.renomearProva).not.toHaveBeenCalled();
    });

    it('⚠️ editar recusado pelo ms: nada é renomeado nos eventos', async () => {
      const { controller, provaService, provaNosEventos } = make();
      provaService.editarDados.mockRejectedValue(new Error('409'));
      await expect(
        controller.editarDados('p1', { nome: 'X' }, req),
      ).rejects.toThrow('409');
      expect(provaNosEventos.renomearProva).not.toHaveBeenCalled();
    });

    it('excluir sem evento: chama o ms com o ator', async () => {
      const { controller, provaService } = make();
      await expect(controller.excluir('p1', req)).resolves.toEqual({
        nome: 'teste',
      });
      expect(provaService.excluir).toHaveBeenCalledWith('p1', {
        userId: 'user-1',
        cursinhoId: 'curs-A',
      });
    });

    it('⚠️ prova em evento de simulado → 409 com os eventos, e o ms nem é chamado', async () => {
      const { controller, provaService, provaNosEventos } = make();
      provaNosEventos.eventosComProva.mockResolvedValue([
        'Simulado de outubro',
      ]);
      await expect(controller.excluir('p1', req)).rejects.toThrow(
        'a prova está no evento de simulado "Simulado de outubro"',
      );
      expect(provaService.excluir).not.toHaveBeenCalled();
    });

    it.each(['editarDados', 'excluir'] as const)(
      '%s exige cadastrarProvasCursinho, na rota',
      (metodo) => {
        expect(
          Reflect.getMetadata(
            PermissionsGuard.name,
            CursinhoProvaController.prototype[metodo],
          ),
        ).toBe(Permissions.cadastrarProvasCursinho);
      },
    );
  });
});
