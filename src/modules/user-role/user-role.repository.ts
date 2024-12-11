import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EntityManager } from 'typeorm';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { GetUserDtoInput } from './dto/get-user.dto.input';
import { UserRole } from './user-role.entity';

@Injectable()
export class UserRoleRepository extends BaseRepository<UserRole> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(UserRole));
  }

  async update(userRole: UserRole) {
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
    name,
  }: GetUserDtoInput): Promise<GetAllOutput<UserRole>> {
    const query = this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.user', 'user')
      .leftJoinAndSelect('entity.role', 'role')
      .orderBy('entity.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const count = this.repository
      .createQueryBuilder('entity')
      .leftJoin('entity.user', 'user');

    if (name) {
      query.andWhere(
        '(user.firstName LIKE :name OR user.lastName LIKE :name)',
        { name: `%${name}%` },
      );
      count.andWhere(
        '(user.firstName LIKE :name OR user.lastName LIKE :name)',
        { name: `%${name}%` },
      );
    }
    const [data, totalItems] = await Promise.all([
      query.getMany(),
      count.getCount(),
    ]);
    return {
      data,
      page,
      limit,
      totalItems,
    };
  }
}
