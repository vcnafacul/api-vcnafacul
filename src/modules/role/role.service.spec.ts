import { RoleService } from './role.service';
import { CreateRoleDtoInput } from './dto/create-role.dto';

function makeService() {
  const roleRepository = {
    findOneBy: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(async (r) => r),
    update: jest.fn().mockImplementation(async (r) => r),
  };
  const service = new RoleService(roleRepository as any);
  return { service, roleRepository };
}

function baseDto(
  overrides: Partial<CreateRoleDtoInput> = {},
): CreateRoleDtoInput {
  return {
    name: 'Cursinho X',
    base: false,
    ...overrides,
  } as CreateRoleDtoInput;
}

describe('RoleService.create — permissões provas cursinho', () => {
  it('persiste cadastrarProvasCursinho e liga visualizar (implies)', async () => {
    const { service } = makeService();
    const role = await service.create(
      baseDto({ cadastrarProvasCursinho: true }),
    );
    expect(role.cadastrarProvasCursinho).toBe(true);
    expect(role.visualizarProvasCursinho).toBe(true);
  });

  it('visualizarProvasCursinho sozinho não liga cadastrar', async () => {
    const { service } = makeService();
    const role = await service.create(
      baseDto({ visualizarProvasCursinho: true }),
    );
    expect(role.visualizarProvasCursinho).toBe(true);
    expect(role.cadastrarProvasCursinho).toBe(false);
  });

  it('sem os campos (undefined) → ambos false', async () => {
    const { service } = makeService();
    const role = await service.create(baseDto());
    expect(role.cadastrarProvasCursinho).toBe(false);
    expect(role.visualizarProvasCursinho).toBe(false);
  });
});

describe('RoleService — enviarNotificacao (pwa-push BE-03)', () => {
  it('create persiste enviarNotificacao = true', async () => {
    const { service } = makeService();
    const role = await service.create(baseDto({ enviarNotificacao: true }));
    expect(role.enviarNotificacao).toBe(true);
  });

  it('⚠️ sem o campo, a permissão nasce desligada', async () => {
    const { service } = makeService();
    const role = await service.create(baseDto());
    expect(role.enviarNotificacao).toBe(false);
  });

  it('update liga e desliga enviarNotificacao', async () => {
    const { service, roleRepository } = makeService();
    const existente = { id: 'r1', name: 'Admin', enviarNotificacao: false };
    roleRepository.findOneBy.mockResolvedValue(existente);

    await service.update({ ...baseDto(), id: 'r1', enviarNotificacao: true });
    expect(existente.enviarNotificacao).toBe(true);

    await service.update({ ...baseDto(), id: 'r1', enviarNotificacao: false });
    expect(existente.enviarNotificacao).toBe(false);
  });
});
