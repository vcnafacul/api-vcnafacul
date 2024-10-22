import { Module, OnModuleInit } from '@nestjs/common';
import { RoleRepository } from 'src/modules/role/role.repository';
import { RoleSeedService } from './1-role.seed';
import { RoleUpdateAdminSeedService } from './2-role-update-admin.seed';
import { RoleManagerPartnerSeedService } from './3-role-manager-partner';

@Module({
  providers: [
    RoleSeedService,
    RoleRepository,
    RoleUpdateAdminSeedService,
    RoleManagerPartnerSeedService,
  ],
})
export class SeederModule implements OnModuleInit {
  constructor(
    private readonly roleSeedService: RoleSeedService,
    private readonly roleUpdateAdminSeedService: RoleUpdateAdminSeedService,
    private readonly roleManagerPartnerSeedService: RoleManagerPartnerSeedService,
  ) {}
  async onModuleInit() {
    await this.roleSeedService.seed();
    await this.roleUpdateAdminSeedService.seed();
    await this.roleManagerPartnerSeedService.seed();
  }
}
