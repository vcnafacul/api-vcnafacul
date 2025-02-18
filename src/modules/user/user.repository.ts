import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { Role } from '../role/role.entity';
import { UserRole } from '../user-role/user-role.entity';
import { User } from './user.entity';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(User));
  }

  async createWithRole(user: User, role: Role): Promise<User> {
    let newUser = null;
    await this._entityManager.transaction(async (tem) => {
      newUser = tem.getRepository(User).create(user);
      await tem.save(User, newUser);

      const newUserRole = tem.getRepository(UserRole).create({
        userId: newUser.id,
        roleId: role.id,
      });
      await tem.save(UserRole, newUserRole);
    });
    return this.findOneBy({ email: newUser.email });
  }

  async findOneBy(where: object): Promise<User> {
    return await this.repository.findOne({
      where,
      relations: ['userRole', 'userRole.role'],
      cache: false,
    });
  }

  async update(user: User) {
    user.updatedAt = new Date();
    await this.repository.save(user);
  }

  async deleteUser(user: User) {
    await this.repository.softDelete({ id: user.id });
  }

  async getValidatorGeo() {
    return await this.repository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.userRole', 'userRole')
      .innerJoinAndSelect(
        'userRole.role',
        'role',
        'role.validarCursinho = :validarCursinho',
        { validarCursinho: true },
      )
      .select(['user.email'])
      .getMany();
  }
}
