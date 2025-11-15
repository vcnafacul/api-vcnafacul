import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EntityManager } from 'typeorm';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { AggregateUserLastAcessDtoOutput } from './dto/aggregate-user-last-acess.dto.output';
import { AggregateUserPeriodDtoOutput } from './dto/aggregate-user-period.dto.output';
import { AggregateUsersByRoleDtoOutput } from './dto/aggregate-users-by-role.dto.output';
import { GetUserDtoInput } from './dto/get-user.dto.input';
import { Period } from './enum/period';
import { buildFullSeriesActive } from './handler/build-full-series-active';
import { buildFullSeriesLastAccess } from './handler/build-full-series-last-access';
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

  async updateLastAcess(user: User) {
    user.lastAccess = new Date();
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

  async findAllActive(): Promise<User[]> {
    return await this.repository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL')
      .andWhere('user.emailConfirmSended IS NULL')
      .getMany();
  }

  async aggregateUsersByPeriod(
    groupBy: Period,
  ): Promise<AggregateUserPeriodDtoOutput[]> {
    let dateExpr: string;
    switch (groupBy) {
      case 'day':
        dateExpr = 'DATE_FORMAT(u.created_at, "%Y-%m-%d")';
        break;
      case 'month':
        dateExpr = "DATE_FORMAT(u.created_at, '%Y-%m')";
        break;
      case 'year':
        dateExpr = 'YEAR(u.created_at)';
        break;
      default:
        throw new Error('Invalid groupBy value');
    }

    const qb = this.repository
      .createQueryBuilder('u')
      .select(`${dateExpr}`, 'period')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN u.email_confirm_sended IS NULL THEN 1 ELSE 0 END)',
        'active',
      )
      .groupBy('period')
      .orderBy('period', 'ASC');

    const results = await qb.getRawMany();

    const raw = results.map((r) => ({
      period: r.period,
      total: Number(r.total),
      active: Number(r.active),
    }));

    return buildFullSeriesActive(groupBy, raw);
  }

  async aggregateUsersByRole(): Promise<AggregateUsersByRoleDtoOutput[]> {
    return (await this.repository
      .createQueryBuilder('u')
      .innerJoin('u.role', 'r')
      .select('r.name', 'name')
      .addSelect('COUNT(*)', 'total')
      .groupBy('r.id')
      .addGroupBy('r.name')
      .orderBy('total', 'DESC')
      .getRawMany()) as AggregateUsersByRoleDtoOutput[];
  }

  async aggregateUsersByLastAcess(
    groupBy: Period,
  ): Promise<AggregateUserLastAcessDtoOutput[]> {
    let dateExpr: string;
    switch (groupBy) {
      case 'day':
        dateExpr = 'DATE_FORMAT(u.lastAccess, "%Y-%m-%d")';
        break;
      case 'month':
        dateExpr = "DATE_FORMAT(u.lastAccess, '%Y-%m')";
        break;
      case 'year':
        dateExpr = 'YEAR(u.lastAccess)';
        break;
      default:
        throw new Error('Invalid groupBy value');
    }

    const query = await this.repository
      .createQueryBuilder('u')
      .select(`${dateExpr}`, 'period')
      .addSelect('COUNT(*)', 'total')
      .where('u.lastAccess IS NOT NULL')
      .groupBy('period')
      .orderBy('period', 'ASC');

    const results = await query.getRawMany();
    const raw = results.map((r) => ({
      period: r.period,
      total: Number(r.total),
    }));
    return buildFullSeriesLastAccess(groupBy, raw);
  }

  async searchUsersByName(name: string): Promise<User[]> {
    return await this.repository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.phone',
        'user.firstName',
        'user.lastName',
        'user.socialName',
        'user.useSocialName',
      ])
      .where('CONCAT(user.firstName, " ", user.lastName) LIKE :name', {
        name: `%${name}%`,
      })
      .orWhere('CONCAT(user.socialName, " ", user.lastName) LIKE :name', {
        name: `%${name}%`,
      })
      .limit(10)
      .getMany();
  }
}
