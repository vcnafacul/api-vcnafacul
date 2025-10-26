import { Injectable, Logger } from '@nestjs/common';
import { RoleRepository } from 'src/modules/role/role.repository';

@Injectable()
export class RoleUpdateAdminSeedService {
  private readonly logger = new Logger(RoleUpdateAdminSeedService.name);

  constructor(private readonly roleRepository: RoleRepository) {}

  async seed() {
    this.logger.log('Iniciando atualização da role admin...');

    try {
      // Verifica se a role admin existe antes de tentar atualizar
      const adminRole = await this.roleRepository.findOneBy({ name: 'admin' });

      if (!adminRole) {
        this.logger.warn('Role admin não encontrada, pulando atualização');
        return;
      }

      // Atualiza as permissões da role admin
      await this.roleRepository.updateRole('admin', {
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
        gerenciarProcessoSeletivo: true,
        gerenciarColaboradores: true,
        gerenciarTurmas: true,
        visualizarTurmas: true,
        gerenciarEstudantes: true,
        visualizarEstudantes: true,
        gerenciarPermissoesCursinho: true,
      });

      this.logger.log('Role admin atualizada com sucesso');
    } catch (error) {
      this.logger.error('Erro ao atualizar role admin:', error.message);
      throw error; // Re-throw para parar a execução em caso de erro
    }
  }
}
