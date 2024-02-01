import { Injectable } from '@nestjs/common';
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
  constructor(private readonly roleRepository: RoleRepository) {}
  async seed() {
    await Promise.all(
      RoleData.map(async (role) => {
        this.roleRepository.create(role as Role).catch(() => {});
      }),
    );
  }
}
