import { Injectable } from '@nestjs/common';
import { RoleRepository } from './role.repository';

@Injectable()
export class RoleService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async findAll() {
    return await this.roleRepository.findAll();
  }

  async findById(id: number) {
    return await this.roleRepository.findById(id);
  }
}
