import { Module, OnModuleInit } from '@nestjs/common';
import { RoleSeedService } from './1-role.seed';
import { RoleRepository } from 'src/modules/role/role.repository';
import { RoleUpdateAdminSeedService } from './2-role-update-admin.seed';

@Module({
  providers: [RoleSeedService, RoleRepository, RoleUpdateAdminSeedService],
})
export class SeederModule implements OnModuleInit {
  constructor(
    private readonly roleSeedService: RoleSeedService,
    private readonly roleUpdateAdminSeedService: RoleUpdateAdminSeedService,
  ) {}
  async onModuleInit() {
    await this.roleSeedService.seed();
    await this.roleUpdateAdminSeedService.seed();
  }
}
