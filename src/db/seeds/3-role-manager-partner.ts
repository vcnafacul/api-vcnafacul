import { Injectable } from '@nestjs/common';
import { Permissions, Role } from 'src/modules/role/role.entity';
import { RoleRepository } from 'src/modules/role/role.repository';

const ManagerPartner = {
  name: Permissions.gerenciarInscricoesCursinhoParceiro,
  gerenciarInscricoesCursinhoParceiro: true,
};

@Injectable()
export class RoleManagerPartnerSeedService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async seed() {
    await this.roleRepository.create(ManagerPartner as Role).catch(() => {
      // console.log(e.message);
    });
  }
}
