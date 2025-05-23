import { Injectable } from '@nestjs/common';
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
    const role = new Role();

    role.name = roleDto.name;
    role.base = roleDto.base;
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

    if (partnerPrepCourse) {
      role.partnerPrepCourse = partnerPrepCourse;
    }

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
    role.base = roleDto.base;
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
    return await this.roleRepository.update(role);
  }

  async findOneById(id: string) {
    return await this.roleRepository.findOneBy({ id: id });
  }

  async findOneByIdWithPartner(id: string) {
    return await this.roleRepository.findOneByIdWithPartner(id);
  }
}
