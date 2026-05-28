import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { IsNull } from 'typeorm';
import { PartnerPrepCourse } from '../prepCourse/partnerPrepCourse/partner-prep-course.entity';
import { CreateRoleDtoInput } from './dto/create-role.dto';
import { GetAllRoleDto } from './dto/get-all-role.dto';
import { UpdateRoleDtoInput } from './dto/update.role.dto';
import { Role } from './role.entity';
import { RoleRepository } from './role.repository';
import { Permissions } from './permissions/permissions';
import { resolveImpliedPermissions } from './permissions/permission-resolver';

@Injectable()
export class RoleService extends BaseService<Role> {
  constructor(private readonly roleRepository: RoleRepository) {
    super(roleRepository);
  }

  async findAllByDTO({
    page,
    limit,
  }: GetAllInput): Promise<GetAllOutput<GetAllRoleDto>> {
    const data = await this.roleRepository.findAllBy({
      page,
      limit,
      where: {
        partnerPrepCourse: IsNull(),
      },
    });
    return {
      data: data.data.map((d) => ({ id: d.id, name: d.name })),
      page,
      limit,
      totalItems: data.totalItems,
    };
  }

  async findAll() {
    const data = await this.roleRepository.findAllBy({
      page: 1,
      limit: 10000,
      where: {
        partnerPrepCourse: IsNull(),
      },
    });
    return data.data;
  }

  async create(
    roleDto: CreateRoleDtoInput,
    partnerPrepCourse: PartnerPrepCourse = null,
  ) {
    const roleBase = await this.roleRepository.findOneBy({
      id: roleDto.roleBase,
    });
    if (roleDto.roleBase && !roleBase) {
      throw new HttpException('Role Base not found', HttpStatus.NOT_FOUND);
    }

    const resolved = resolveImpliedPermissions({
      [Permissions.validarCursinho]:
        roleBase?.validarCursinho || roleDto.validarCursinho,
      [Permissions.criarSimulado]:
        roleBase?.criarSimulado || roleDto.criarSimulado,
      [Permissions.criarQuestao]:
        roleBase?.criarQuestao || roleDto.criarQuestao,
      [Permissions.validarQuestao]:
        roleBase?.validarQuestao || roleDto.validarQuestao,
      [Permissions.visualizarQuestao]:
        roleBase?.visualizarQuestao || roleDto.visualizarQuestao,
      [Permissions.uploadNews]: roleBase?.uploadNews || roleDto.uploadNews,
      [Permissions.cadastrarProvas]:
        roleBase?.cadastrarProvas || roleDto.cadastrarProvas,
      [Permissions.visualizarProvas]:
        roleBase?.visualizarProvas || roleDto.visualizarProvas,
      [Permissions.gerenciadorDemanda]:
        roleBase?.gerenciadorDemanda || roleDto.gerenciadorDemanda,
      [Permissions.uploadDemanda]:
        roleBase?.uploadDemanda || roleDto.uploadDemanda,
      [Permissions.validarDemanda]:
        roleBase?.validarDemanda || roleDto.validarDemanda,
      [Permissions.visualizarDemanda]:
        roleBase?.visualizarDemanda || roleDto.visualizarDemanda,
      [Permissions.alterarPermissao]:
        roleBase?.alterarPermissao || roleDto.alterarPermissao,
      [Permissions.revisarTodasRedacoes]:
        roleBase?.revisarTodasRedacoes || roleDto.revisarTodasRedacoes,
      [Permissions.supportAgent]:
        roleBase?.supportAgent || roleDto.supportAgent,
      // Non-base permissions: dto only
      [Permissions.gerenciarProcessoSeletivo]:
        roleDto.gerenciarProcessoSeletivo,
      [Permissions.gerenciarColaboradores]: roleDto.gerenciarColaboradores,
      [Permissions.gerenciarTurmas]: roleDto.gerenciarTurmas,
      [Permissions.visualizarTurmas]: roleDto.visualizarTurmas,
      [Permissions.gerenciarEstudantes]: roleDto.gerenciarEstudantes,
      [Permissions.visualizarEstudantes]: roleDto.visualizarEstudantes,
      [Permissions.gerenciarPermissoesCursinho]:
        roleDto.gerenciarPermissoesCursinho,
      [Permissions.visualizarMinhasInscricoes]:
        roleDto.visualizarMinhasInscricoes,
      [Permissions.gerenciarFormularioGlobal]:
        roleDto.gerenciarFormularioGlobal,
      [Permissions.gerenciarFormulario]: roleDto.gerenciarFormulario,
      [Permissions.gerenciarTemas]: roleDto.gerenciarTemas,
      [Permissions.revisarRedacoes]: roleDto.revisarRedacoes,
      [Permissions.partnerPrepSupportAgent]: roleDto.partnerPrepSupportAgent,
    });

    const role = new Role();
    role.name = roleDto.name;
    role.base = roleDto.base;
    role.roleBase = roleBase;

    // Assign all resolved permissions
    for (const [key, value] of Object.entries(resolved)) {
      role[key] = value ?? false;
    }

    // gerenciarPermissoesCursinho special case: falls back to alterarPermissao
    if (!roleDto.gerenciarPermissoesCursinho) {
      role.gerenciarPermissoesCursinho =
        resolved[Permissions.alterarPermissao] ?? false;
    }

    if (partnerPrepCourse) {
      role.partnerPrepCourse = partnerPrepCourse;
      role.base = false;
    }

    return await this.roleRepository.create(role);
  }

  async update(roleDto: UpdateRoleDtoInput) {
    const role = await this.roleRepository.findOneBy({ id: roleDto.id });
    if (!role) {
      throw new Error('Role not found');
    }

    const resolved = resolveImpliedPermissions({
      [Permissions.validarCursinho]: roleDto.validarCursinho,
      [Permissions.criarSimulado]: roleDto.criarSimulado,
      [Permissions.criarQuestao]: roleDto.criarQuestao,
      [Permissions.validarQuestao]: roleDto.validarQuestao,
      [Permissions.visualizarQuestao]: roleDto.visualizarQuestao,
      [Permissions.uploadNews]: roleDto.uploadNews,
      [Permissions.cadastrarProvas]: roleDto.cadastrarProvas,
      [Permissions.visualizarProvas]: roleDto.visualizarProvas,
      [Permissions.gerenciadorDemanda]: roleDto.gerenciadorDemanda,
      [Permissions.uploadDemanda]: roleDto.uploadDemanda,
      [Permissions.validarDemanda]: roleDto.validarDemanda,
      [Permissions.visualizarDemanda]: roleDto.visualizarDemanda,
      [Permissions.alterarPermissao]: roleDto.alterarPermissao,
      [Permissions.gerenciarProcessoSeletivo]:
        roleDto.gerenciarProcessoSeletivo,
      [Permissions.gerenciarColaboradores]: roleDto.gerenciarColaboradores,
      [Permissions.gerenciarTurmas]: roleDto.gerenciarTurmas,
      [Permissions.visualizarTurmas]: roleDto.visualizarTurmas,
      [Permissions.gerenciarEstudantes]: roleDto.gerenciarEstudantes,
      [Permissions.visualizarEstudantes]: roleDto.visualizarEstudantes,
      [Permissions.gerenciarPermissoesCursinho]:
        roleDto.gerenciarPermissoesCursinho,
      [Permissions.visualizarMinhasInscricoes]:
        roleDto.visualizarMinhasInscricoes,
      [Permissions.gerenciarFormularioGlobal]:
        roleDto.gerenciarFormularioGlobal,
      [Permissions.gerenciarFormulario]: roleDto.gerenciarFormulario,
      [Permissions.gerenciarTemas]: roleDto.gerenciarTemas,
      [Permissions.revisarRedacoes]: roleDto.revisarRedacoes,
      [Permissions.revisarTodasRedacoes]: roleDto.revisarTodasRedacoes,
      [Permissions.supportAgent]: roleDto.supportAgent,
      [Permissions.partnerPrepSupportAgent]: roleDto.partnerPrepSupportAgent,
    });

    role.name = roleDto.name;

    for (const [key, value] of Object.entries(resolved)) {
      role[key] = value ?? false;
    }

    // gerenciarPermissoesCursinho special case: falls back to alterarPermissao
    if (!roleDto.gerenciarPermissoesCursinho) {
      role.gerenciarPermissoesCursinho =
        resolved[Permissions.alterarPermissao] ?? false;
    }

    // Propagate base permissions down to children
    if (role.children?.length > 0) {
      const BASE_PERMISSIONS: Permissions[] = [
        Permissions.validarCursinho,
        Permissions.criarSimulado,
        Permissions.criarQuestao,
        Permissions.validarQuestao,
        Permissions.visualizarQuestao,
        Permissions.uploadNews,
        Permissions.cadastrarProvas,
        Permissions.visualizarProvas,
        Permissions.gerenciadorDemanda,
        Permissions.uploadDemanda,
        Permissions.validarDemanda,
        Permissions.visualizarDemanda,
        Permissions.alterarPermissao,
        Permissions.visualizarMinhasInscricoes,
        Permissions.gerenciarFormularioGlobal,
        Permissions.gerenciarFormulario,
        Permissions.gerenciarTemas,
        Permissions.revisarTodasRedacoes,
        Permissions.supportAgent,
      ];

      await Promise.all(
        role.children.map(async (child) => {
          for (const permission of BASE_PERMISSIONS) {
            child[permission] = role[permission];
          }
          await this.roleRepository.update(child);
        }),
      );
    }

    // Only update base flag if role has no children
    if (!role.base || role.children?.length === 0) {
      role.base = roleDto.base;
    }

    return await this.roleRepository.update(role);
  }

  async findOneById(id: string) {
    return await this.roleRepository.findOneBy({ id: id });
  }

  async findOneByIdWithPartner(id: string) {
    return await this.roleRepository.findOneByIdWithPartner(id);
  }
}
