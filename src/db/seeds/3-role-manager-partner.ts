import { Injectable, Logger } from '@nestjs/common';
import { Permissions, Role } from 'src/modules/role/role.entity';
import { RoleRepository } from 'src/modules/role/role.repository';

const ManagerPartner = {
  name: Permissions.gerenciarProcessoSeletivo,
  gerenciarProcessoSeletivo: true,
};

@Injectable()
export class RoleManagerPartnerSeedService {
  private readonly logger = new Logger(RoleManagerPartnerSeedService.name);

  constructor(private readonly roleRepository: RoleRepository) {}

  async seed() {
    this.logger.log('Iniciando criação da role manager partner...');

    try {
      // Verifica se a role já existe
      const existingRole = await this.roleRepository.findOneBy({
        name: ManagerPartner.name,
      });

      if (existingRole) {
        this.logger.log(
          `Role '${ManagerPartner.name}' já existe, pulando criação`,
        );
        return;
      }

      // Cria a role manager partner
      await this.roleRepository.create(ManagerPartner as Role);
      this.logger.log(`Role '${ManagerPartner.name}' criada com sucesso`);
    } catch (error) {
      this.logger.error(
        `Erro ao criar role '${ManagerPartner.name}':`,
        error.message,
      );
      throw error; // Re-throw para parar a execução em caso de erro
    }
  }
}
