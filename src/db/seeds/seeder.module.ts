import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { RoleRepository } from 'src/modules/role/role.repository';
import { RoleSeedService } from './1-role.seed';
import { RoleUpdateAdminSeedService } from './2-role-update-admin.seed';
import { RoleManagerPartnerSeedService } from './3-role-manager-partner';
import { DeclarationProgressBackfillSeedService } from './4-declaration-progress-backfill.seed';

@Module({
  providers: [
    RoleSeedService,
    RoleRepository,
    RoleUpdateAdminSeedService,
    RoleManagerPartnerSeedService,
    DeclarationProgressBackfillSeedService,
  ],
})
export class SeederModule implements OnModuleInit {
  private readonly logger = new Logger(SeederModule.name);

  constructor(
    private readonly roleSeedService: RoleSeedService,
    private readonly roleUpdateAdminSeedService: RoleUpdateAdminSeedService,
    private readonly roleManagerPartnerSeedService: RoleManagerPartnerSeedService,
    private readonly declarationProgressBackfillSeedService: DeclarationProgressBackfillSeedService,
  ) {}

  async onModuleInit() {
    this.logger.log('Iniciando execução dos seeds...');

    try {
      // Executa os seeds sequencialmente para evitar condições de corrida
      await this.roleSeedService.seed();
      await this.roleUpdateAdminSeedService.seed();
      await this.roleManagerPartnerSeedService.seed();
      await this.declarationProgressBackfillSeedService.seed();

      this.logger.log('Todos os seeds executados com sucesso!');
    } catch (error) {
      this.logger.error('Erro durante execução dos seeds:', error.message);
      // Não re-throw aqui para não quebrar a inicialização da aplicação
      // Mas os logs vão mostrar o problema
    }
  }
}
