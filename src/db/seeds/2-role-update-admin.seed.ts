import { Injectable } from '@nestjs/common';
import { RoleRepository } from 'src/modules/role/role.repository';

@Injectable()
export class RoleUpdateAdminSeedService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async seed() {
    await this.roleRepository
      .updateRole('admin', {
        criarQuestao: true,
        visualizarQuestao: true,
        validarQuestao: true,
        uploadNews: true,
        visualizarProvas: true,
        cadastrarProvas: true,
        visualizarDemanda: true,
        uploadDemanda: true,
        validarDemanda: true,
        gerenciadorDemanda: true,
      })
      .catch(() => {
        // console.log(e.message);
      });
  }
}
