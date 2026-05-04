import { Injectable, Logger } from '@nestjs/common';
import { Role } from 'src/modules/role/role.entity';
import { RoleRepository } from 'src/modules/role/role.repository';

@Injectable()
export class RoleEstudanteSeedService {
  private readonly logger = new Logger(RoleEstudanteSeedService.name);

  constructor(private readonly roleRepository: RoleRepository) {}

  async seed() {
    this.logger.log('Iniciando seed da role estudante...');

    try {
      let role = await this.roleRepository.findOneBy({ name: 'estudante' });

      if (!role) {
        this.logger.log('Role estudante não encontrada, criando...');
        await this.roleRepository.create({
          name: 'estudante',
        } as Role);
        role = await this.roleRepository.findOneBy({ name: 'estudante' });
      }

      if (!role) {
        this.logger.warn('Falha ao criar role estudante, pulando atualização de permissões');
        return;
      }

      await this.roleRepository.updateRole('estudante', {
        visualizarMinhasInscricoes: true,
      });

      this.logger.log('Role estudante atualizada com permissão visualizarMinhasInscricoes');
    } catch (error) {
      this.logger.error('Erro ao processar role estudante:', error.message);
      throw error;
    }
  }
}
