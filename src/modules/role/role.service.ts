import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { CreateRoleDtoInput } from './dto/create-role.dto';
import { GetAllRoleDto } from './dto/get-all-role.dto';
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
    const data = await this._repository.findAllBy({
      page,
      limit,
    });
    return {
      data: data.data.map((d) => ({ id: d.id, name: d.name })),
      page,
      limit,
      totalItems: data.totalItems,
    };
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
    role.gerenciarInscricoesCursinhoParceiro =
      roleDto.gerenciarInscricoesCursinhoParceiro;

    return await this.roleRepository.create(role);
  }
}
