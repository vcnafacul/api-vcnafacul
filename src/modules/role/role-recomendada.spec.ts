import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RoleService } from './role.service';

function makeService(role: object | null) {
  const roleRepository = {
    findOneBy: jest.fn().mockResolvedValue(role),
    findOneByIdWithPartner: jest.fn().mockResolvedValue(role),
    update: jest.fn().mockResolvedValue(undefined),
    create: jest.fn().mockImplementation(async (r) => r),
    findRecommended: jest
      .fn()
      .mockResolvedValue([{ id: 'r1', name: 'Revisor' }]),
  };
  const service = new RoleService(roleRepository as any);
  return { service, roleRepository };
}

const doProjeto = (over = {}) => ({
  id: 'r1',
  name: 'Revisor',
  partnerPrepCourse: null,
  alterarPermissao: false,
  isRecommended: false,
  ...over,
});

describe('RoleService.setRecommended', () => {
  it('marca perfil do projeto como recomendado', async () => {
    const { service, roleRepository } = makeService(doProjeto());
    await service.setRecommended('r1', true);
    expect(roleRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'r1', isRecommended: true }),
    );
  });

  it('desmarca', async () => {
    const { service, roleRepository } = makeService(
      doProjeto({ isRecommended: true }),
    );
    await service.setRecommended('r1', false);
    expect(roleRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ isRecommended: false }),
    );
  });

  it.each([
    ['perfil de cursinho', { partnerPrepCourse: { id: 'c1' } }],
    ['o perfil aluno', { name: 'aluno' }],
    ['perfil com alterarPermissao', { alterarPermissao: true }],
  ])('recusa %s', async (_, over) => {
    const { service, roleRepository } = makeService(doProjeto(over));
    await expect(service.setRecommended('r1', true)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(roleRepository.update).not.toHaveBeenCalled();
  });

  it('desmarcar não passa pelas recusas (limpa marca antiga)', async () => {
    const { service, roleRepository } = makeService(
      doProjeto({ isRecommended: true, alterarPermissao: true }),
    );
    await service.setRecommended('r1', false);
    expect(roleRepository.update).toHaveBeenCalled();
  });

  it('perfil inexistente → 404', async () => {
    const { service } = makeService(null);
    await expect(service.setRecommended('x', true)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('RoleService.update — perfil recomendado', () => {
  it('não deixa ganhar alterarPermissao', async () => {
    const { service, roleRepository } = makeService(
      doProjeto({ isRecommended: true, children: [] }),
    );
    await expect(
      service.update({
        id: 'r1',
        name: 'Revisor',
        alterarPermissao: true,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(roleRepository.update).not.toHaveBeenCalled();
  });

  it('perfil não recomendado continua podendo ter alterarPermissao', async () => {
    const { service, roleRepository } = makeService(
      doProjeto({ children: [] }),
    );
    await service.update({
      id: 'r1',
      name: 'Revisor',
      alterarPermissao: true,
    } as any);
    expect(roleRepository.update).toHaveBeenCalled();
  });
});

describe('RoleService.create — perfil de cursinho', () => {
  it('não herda a marca de recomendado do perfil base', async () => {
    const { service } = makeService(doProjeto({ isRecommended: true }));
    const role = await service.create(
      { name: 'Coord X', base: false, roleBase: 'r1' } as any,
      { id: 'c1' } as any,
    );
    expect(role.isRecommended).toBeFalsy();
  });
});
