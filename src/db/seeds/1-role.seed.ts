import { Injectable, Logger } from '@nestjs/common';
import { Role } from 'src/modules/role/role.entity';
import { RoleRepository } from 'src/modules/role/role.repository';

const RoleData = [
  { name: 'aluno' },
  {
    name: 'admin',
    validarCursinho: true,
    alterarPermissao: true,
    criarSimulado: true,
  },
];

@Injectable()
export class RoleSeedService {
  private readonly logger = new Logger(RoleSeedService.name);

  constructor(private readonly roleRepository: RoleRepository) {}

  async seed() {
    this.logger.log('Iniciando seed de roles...');

    for (const roleData of RoleData) {
      try {
        // Verifica se a role já existe
        const existingRole = await this.roleRepository.findOneBy({
          name: roleData.name,
        });

        if (existingRole) {
          this.logger.log(`Role '${roleData.name}' já existe, pulando criação`);
          continue;
        }

        // Cria a role sequencialmente
        await this.roleRepository.create(roleData as Role);
        this.logger.log(`Role '${roleData.name}' criada com sucesso`);
      } catch (error) {
        this.logger.error(
          `Erro ao criar role '${roleData.name}':`,
          error.message,
        );
        throw error; // Re-throw para parar a execução em caso de erro
      }
    }

    this.logger.log('Seed de roles concluído');
  }
}
