import { Module, OnModuleInit } from '@nestjs/common';
import { RoleSeedService } from './role.seed';
import { RoleRepository } from 'src/modules/role/role.repository';

@Module({
  providers: [RoleSeedService, RoleRepository],
})
export class SeederModule implements OnModuleInit {
  constructor(private readonly roleSeedService: RoleSeedService) {}
  async onModuleInit() {
    await this.roleSeedService.seed();
  }
}
