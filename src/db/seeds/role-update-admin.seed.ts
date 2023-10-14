import { Injectable } from '@nestjs/common';
import { RoleRepository } from 'src/modules/role/role.repository';

@Injectable()
export class RoleUpdateAdminSeedService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async seed() {
    await this.roleRepository
      .update('admin', { bancoQuestoes: true, uploadNews: true })
      .catch(() => {});
  }
}
