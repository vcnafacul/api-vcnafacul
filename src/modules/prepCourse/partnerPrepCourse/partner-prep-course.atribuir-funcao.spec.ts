import { HttpException } from '@nestjs/common';
import { PartnerPrepCourseService } from './partner-prep-course.service';

/**
 * A troca de função no cursinho (card 02 de `convite-de-colaborador`) — o
 * service monta a situação e só escreve quando as regras deixam.
 */
const usuario = (id: string, gerenciarPermissoesCursinho = false) => ({
  id,
  firstName: id,
  lastName: 'Silva',
  role: { gerenciarPermissoesCursinho },
});

const montar = (opcoes: {
  quemPedeEhAdmin?: boolean;
  alvoCursinho?: string | null;
  alvoAtivo?: boolean;
  funcaoCursinho?: string | null;
  funcaoDeAdmin?: boolean;
}) => {
  const {
    quemPedeEhAdmin = false,
    alvoCursinho = 'c1',
    alvoAtivo = true,
    funcaoCursinho = 'c1',
    funcaoDeAdmin = false,
  } = opcoes;
  const repository = {
    findOneByUserId: jest.fn().mockResolvedValue({ id: 'c1' }),
  };
  const userService = {
    findOneBy: jest.fn(async ({ id }: { id: string }) =>
      id === 'gestor' ? usuario('gestor', quemPedeEhAdmin) : usuario(id),
    ),
    updateRole: jest.fn().mockResolvedValue(undefined),
  };
  const collaboratorRepository = {
    findOneByUserId: jest.fn().mockResolvedValue(
      alvoCursinho === undefined
        ? null
        : {
            actived: alvoAtivo,
            partnerPrepCourse: alvoCursinho && { id: alvoCursinho },
          },
    ),
  };
  const roleService = {
    findOneByIdWithPartner: jest.fn().mockResolvedValue({
      id: 'r1',
      name: 'Professor',
      gerenciarPermissoesCursinho: funcaoDeAdmin,
      partnerPrepCourse: funcaoCursinho && { id: funcaoCursinho },
    }),
    findAllBy: jest.fn().mockResolvedValue({
      data: [
        { id: 'r-admin', gerenciarPermissoesCursinho: true },
        { id: 'r-prof', gerenciarPermissoesCursinho: false },
      ],
    }),
  };
  const logPartnerRepository = { create: jest.fn() };
  const service = new PartnerPrepCourseService(
    repository as any,
    userService as any,
    {} as any,
    collaboratorRepository as any,
    {} as any,
    logPartnerRepository as any,
    roleService as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
  return { service, userService, logPartnerRepository };
};

describe('PartnerPrepCourseService.atribuirFuncao', () => {
  it('pedido válido: troca a função e registra no log do cursinho', async () => {
    const { service, userService, logPartnerRepository } = montar({});

    await service.atribuirFuncao('gestor', 'ana', 'r1');

    expect(userService.updateRole).toHaveBeenCalledWith('ana', 'r1');
    expect(logPartnerRepository.create).toHaveBeenCalled();
  });

  it('⚠️ alvo de OUTRO cursinho: 403 e não escreve', async () => {
    const { service, userService } = montar({ alvoCursinho: 'c2' });

    const erro = await service
      .atribuirFuncao('gestor', 'ana', 'r1')
      .catch((e) => e);

    expect(erro).toBeInstanceOf(HttpException);
    expect(erro.getStatus()).toBe(403);
    expect(erro.message).toContain('não é colaboradora deste cursinho');
    expect(userService.updateRole).not.toHaveBeenCalled();
  });

  it('⚠️ função da PLATAFORMA (sem cursinho): recusa mesmo para o admin', async () => {
    // O buraco: o gestor dava a função `admin` da plataforma.
    const { service, userService } = montar({
      quemPedeEhAdmin: true,
      funcaoCursinho: null,
    });

    await expect(service.atribuirFuncao('gestor', 'ana', 'r1')).rejects.toThrow(
      /não pertence a este cursinho/,
    );
    expect(userService.updateRole).not.toHaveBeenCalled();
  });

  it('⚠️ quem só gerencia colaboradores não dá função de admin', async () => {
    const { service } = montar({ funcaoDeAdmin: true });

    await expect(service.atribuirFuncao('gestor', 'ana', 'r1')).rejects.toThrow(
      /Só o administrador/,
    );
  });

  it('o admin do cursinho dá função de admin', async () => {
    const { service, userService } = montar({
      quemPedeEhAdmin: true,
      funcaoDeAdmin: true,
    });

    await service.atribuirFuncao('gestor', 'ana', 'r1');

    expect(userService.updateRole).toHaveBeenCalled();
  });
});

describe('PartnerPrepCourseService.getRolesAtribuiveis', () => {
  it('⚠️ quem não é admin NÃO recebe as funções de admin — filtrado no servidor', async () => {
    const { service } = montar({});

    const roles = await service.getRolesAtribuiveis('gestor');

    expect(roles.map((r) => r.id)).toEqual(['r-prof']);
  });

  it('o admin recebe todas', async () => {
    const { service } = montar({ quemPedeEhAdmin: true });

    const roles = await service.getRolesAtribuiveis('gestor');

    expect(roles.map((r) => r.id)).toEqual(['r-admin', 'r-prof']);
  });
});
