import { User } from './user.entity';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Role } from '../role/role.entity';
import { UserRole } from '../user-role/user-role.entity';

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
    return this.findByEmail(newUser.email);
  }

  async findByEmail(email: string): Promise<User> {
    return await this.repository.findOne({
      where: { email: email },
      relations: ['userRole', 'userRole.role'],
      cache: false,
    });
  }

  override async update(user: User) {
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

  async getVolunteers() {
    return await this.repository
      .createQueryBuilder('volunteer')
      .select([
        'volunteer.collaboratorPhoto',
        'volunteer.firstName',
        'volunteer.lastName',
        'volunteer.collaboratorDescription',
      ])
      .where('volunteer.collaborator = true')
      .andWhere('volunteer.collaboratorPhoto IS NOT NULL')
      .andWhere('volunteer.collaboratorPhoto <> :emptyString', {
        emptyString: '',
      })
      .getMany();
  }
}
