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
    const role = new Role();

    role.name = roleDto.name;
    role.base = roleDto.base;
    role.validarCursinho = roleBase?.validarCursinho || roleDto.validarCursinho;
    role.criarSimulado = roleBase?.criarSimulado || roleDto.criarSimulado;
    role.criarQuestao = roleBase?.criarQuestao || roleDto.criarQuestao;
    role.validarQuestao = roleBase?.validarQuestao || roleDto.validarQuestao;
    role.visualizarQuestao =
      roleBase?.visualizarQuestao ||
      roleDto.validarQuestao ||
      roleDto.criarQuestao
        ? true
        : roleDto.visualizarQuestao;

    role.uploadNews = roleBase?.uploadNews || roleDto.uploadNews;
    role.cadastrarProvas = roleBase?.cadastrarProvas || roleDto.cadastrarProvas;
    role.visualizarProvas =
      roleBase?.visualizarProvas || roleDto.cadastrarProvas
        ? true
        : roleDto.visualizarProvas;

    role.gerenciadorDemanda =
      roleBase?.gerenciadorDemanda || roleDto.gerenciadorDemanda;
    role.uploadDemanda =
      roleBase?.uploadDemanda || roleDto.gerenciadorDemanda
        ? true
        : roleDto.uploadDemanda;
    role.validarDemanda =
      roleBase?.validarDemanda || roleDto.gerenciadorDemanda
        ? true
        : roleDto.validarDemanda;
    role.visualizarDemanda =
      roleBase?.visualizarDemanda ||
      roleDto.uploadDemanda ||
      roleDto.validarDemanda ||
      roleDto.gerenciadorDemanda
        ? true
        : roleDto.visualizarDemanda;

    role.alterarPermissao =
      roleBase?.alterarPermissao || roleDto.alterarPermissao;

    // Não são permissões base
    role.gerenciarProcessoSeletivo = roleDto.gerenciarProcessoSeletivo;
    role.gerenciarColaboradores = roleDto.gerenciarColaboradores;
    role.gerenciarTurmas = roleDto.gerenciarTurmas;
    role.visualizarTurmas = roleDto.gerenciarTurmas
      ? true
      : roleDto.visualizarTurmas;
    role.gerenciarEstudantes = roleDto.gerenciarEstudantes;
    role.visualizarEstudantes = roleDto.gerenciarEstudantes
      ? true
      : roleDto.visualizarEstudantes;
    role.gerenciarPermissoesCursinho = !roleDto.gerenciarPermissoesCursinho
      ? role.alterarPermissao
        ? true
        : false
      : true;

    if (partnerPrepCourse) {
      role.partnerPrepCourse = partnerPrepCourse;
      role.base = false;
    }

    role.roleBase = roleBase;
    return await this.roleRepository.create(role);
  }

  async update(roleDto: UpdateRoleDtoInput) {
    const role = await this.roleRepository.findOneBy({
      id: roleDto.id,
    });
    if (!role) {
      throw new Error('Role not found');
    }

    role.name = roleDto.name;
    role.validarCursinho = roleDto.validarCursinho;
    role.criarSimulado = roleDto.criarSimulado;
    role.criarQuestao = roleDto.criarQuestao;
    role.validarQuestao = roleDto.validarQuestao;
    role.visualizarQuestao =
      roleDto.validarQuestao || roleDto.criarQuestao
        ? true
        : roleDto.visualizarQuestao;

    role.uploadNews = roleDto.uploadNews;
    role.cadastrarProvas = roleDto.cadastrarProvas;
    role.visualizarProvas = roleDto.cadastrarProvas
      ? true
      : roleDto.visualizarProvas;

    role.gerenciadorDemanda = roleDto.gerenciadorDemanda;
    role.uploadDemanda = roleDto.gerenciadorDemanda
      ? true
      : roleDto.uploadDemanda;
    role.validarDemanda = roleDto.gerenciadorDemanda
      ? true
      : roleDto.validarDemanda;
    role.visualizarDemanda =
      roleDto.uploadDemanda ||
      roleDto.validarDemanda ||
      roleDto.gerenciadorDemanda
        ? true
        : roleDto.visualizarDemanda;
    role.gerenciarProcessoSeletivo = roleDto.gerenciarProcessoSeletivo;
    role.gerenciarColaboradores = roleDto.gerenciarColaboradores;
    role.gerenciarTurmas = roleDto.gerenciarTurmas;
    role.visualizarTurmas = roleDto.gerenciarTurmas
      ? true
      : roleDto.visualizarTurmas;
    role.gerenciarEstudantes = roleDto.gerenciarEstudantes;
    role.visualizarEstudantes = roleDto.gerenciarEstudantes
      ? true
      : roleDto.visualizarEstudantes;
    role.alterarPermissao = roleDto.alterarPermissao;
    role.gerenciarPermissoesCursinho = !roleDto.gerenciarPermissoesCursinho
      ? role.alterarPermissao
        ? true
        : false
      : true;

    // Atualiza permissões das filhas
    if (role.children?.length > 0) {
      await Promise.all(
        role.children.map(async (child) => {
          child.validarCursinho = role.validarCursinho;
          child.criarSimulado = role.criarSimulado;
          child.criarQuestao = role.criarQuestao;
          child.validarQuestao = role.validarQuestao;
          child.visualizarQuestao = role.visualizarQuestao;
          child.uploadNews = role.uploadNews;
          child.cadastrarProvas = role.cadastrarProvas;
          child.visualizarProvas = role.visualizarProvas;
          child.gerenciadorDemanda = role.gerenciadorDemanda;
          child.uploadDemanda = role.uploadDemanda;
          child.validarDemanda = role.validarDemanda;
          child.visualizarDemanda = role.visualizarDemanda;
          child.alterarPermissao = role.alterarPermissao;
          await this.roleRepository.update(child);
        }),
      );
    }
    // só atualiza role.base se não é base ou se é base mas não tem filhos
    if (!role.base || (role.base && role.children?.length === 0)) {
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
