import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Role } from './role.entity';
import { BaseRepository } from '../../shared/modules/base/base.repository';

@Injectable()
export class RoleRepository extends BaseRepository<Role> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(Role));
  }

  async create(role: Role): Promise<Role> {
    const newRole = this.repository.create(role);
    await this.repository.save(newRole);
    return newRole;
  }

  async updateRole(name: string, filter: object) {
    await this.repository
      .createQueryBuilder()
      .update(Role)
      .set(filter)
      .where('name = :name', { name })
      .execute();
  }

  async findOneBy(filter: object): Promise<Role> {
    return await this.repository.findOneBy(filter);
  }

  async findById(id: number): Promise<Role> {
    return await this.repository.findOneBy({ id });
  }

  async findBy(filter: object): Promise<Role[]> {
    return await this.repository.findBy(filter);
  }
}
