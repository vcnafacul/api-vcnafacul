import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EntityManager } from 'typeorm';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { GetUserDtoInput } from './dto/get-user.dto.input';
import { User } from './user.entity';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(User));
  }

  async findOneBy(where: object): Promise<User> {
    return await this.repository.findOne({
      where,
      relations: ['role'],
      cache: false,
    });
  }

  override async findAllBy({
    page,
    limit,
    name,
  }: GetUserDtoInput): Promise<GetAllOutput<User>> {
    const query = this.repository
      .createQueryBuilder('entity')
      .orderBy('entity.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .innerJoinAndSelect('entity.role', 'role');

    const count = this.repository.createQueryBuilder('entity');

    if (name) {
      query.andWhere(
        '(entity.firstName LIKE :name OR entity.lastName LIKE :name)',
        { name: `%${name}%` },
      );
      count.andWhere(
        '(entity.firstName LIKE :name OR entity.lastName LIKE :name)',
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
      .innerJoinAndSelect('user.role', 'role')
      .where('role.validarCursinho = :validarCursinho', {
        validarCursinho: true,
      })
      .select(['user.email'])
      .getMany();
  }
}
