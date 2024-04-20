import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { GetAllInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EntityManager } from 'typeorm';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { UserRole } from './user-role.entity';

@Injectable()
export class UserRoleRepository extends BaseRepository<UserRole> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(UserRole));
  }

  override async update(userRole: UserRole) {
    userRole.updatedAt = new Date();
    await this.repository.save(userRole);
  }

  override async findOneBy(where: object): Promise<UserRole> {
    return await this.repository.findOne({
      where: { ...where },
      relations: ['user', 'role'],
    });
  }

  override async findAllBy({
    page,
    limit,
  }: GetAllInput): Promise<GetAllOutput<UserRole>> {
    const [data, totalItems] = await Promise.all([
      this.repository
        .createQueryBuilder('entity')
        .leftJoinAndSelect('entity.user', 'user')
        .leftJoinAndSelect('entity.role', 'role')
        .orderBy('entity.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany(),
      this.repository.createQueryBuilder('entity').getCount(),
    ]);
    return {
      data,
      page,
      limit,
      totalItems,
    };
  }
}
