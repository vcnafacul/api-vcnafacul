import { EntityManager } from 'typeorm';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { UserRole } from './user-role.entity';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserRoleRepository extends BaseRepository<UserRole> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(UserRole));
  }

  async update(userRole: UserRole) {
    await this.repository.save(userRole);
  }

  async findOneBy(filter: object): Promise<UserRole> {
    return await this.repository.findOneBy(filter);
  }

  async findRelations(): Promise<UserRole[]> {
    return await this.repository.find({
      relations: ['user', 'role'],
    });
  }
}
