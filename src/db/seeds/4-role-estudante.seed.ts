import { Injectable, Logger } from '@nestjs/common';
import { Role } from 'src/modules/role/role.entity';
import { RoleRepository } from 'src/modules/role/role.repository';

const EstudanteRole = {
  name: 'estudante',
  visualizarMinhasInscricoes: true,
};

@Injectable()
export class RoleEstudanteSeedService {
  private readonly logger = new Logger(RoleEstudanteSeedService.name);

  constructor(private readonly roleRepository: RoleRepository) {}

  async seed() {
    this.logger.log('Iniciando criação da role estudante...');

    try {
      // Verifica se a role já existe
      const existingRole = await this.roleRepository.findOneBy({
        name: EstudanteRole.name,
      });

      if (existingRole) {
        this.logger.log(
          `Role '${EstudanteRole.name}' já existe, pulando criação`,
        );
        return;
      }

      // Cria a role estudante
      await this.roleRepository.create(EstudanteRole as Role);
      this.logger.log(`Role '${EstudanteRole.name}' criada com sucesso`);
    } catch (error) {
      this.logger.error(
        `Erro ao criar role '${EstudanteRole.name}':`,
        error.message,
      );
      throw error; // Re-throw para parar a execução em caso de erro
    }
  }
}
