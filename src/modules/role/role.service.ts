import { Injectable } from '@nestjs/common';
import { RoleRepository } from './role.repository';
import { CreateRoleDtoInput } from './dto/create-role.dto';
import { Role } from './role.entity';

@Injectable()
export class RoleService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async findAll() {
    return await this.roleRepository.findAll();
  }

  async findById(id: number) {
    return await this.roleRepository.findById(id);
  }

  async create(roleDto: CreateRoleDtoInput) {
    const role = new Role();

    role.name = roleDto.name;
    role.validarCursinho = roleDto.validarCursinho;
    role.alterarPermissao = roleDto.alterarPermissao;
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

    return await this.roleRepository.create(role);
  }
}
