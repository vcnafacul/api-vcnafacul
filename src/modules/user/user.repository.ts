import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EntityManager, Brackets } from 'typeorm';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { AggregateUserLastAcessDtoOutput } from './dto/aggregate-user-last-acess.dto.output';
import { AggregateUserPeriodDtoOutput } from './dto/aggregate-user-period.dto.output';
import { AggregateUsersByRoleDtoOutput } from './dto/aggregate-users-by-role.dto.output';
import { GetUserDtoInput } from './dto/get-user.dto.input';
import { Period } from './enum/period';
import { buildFullSeriesActive } from './handler/build-full-series-active';
import { buildFullSeriesLastAccess } from './handler/build-full-series-last-access';
import { User } from './user.entity';
import { palavrasDaBusca } from './busca-de-usuario';

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
    roleId,
    partnerId,
  }: GetUserDtoInput): Promise<GetAllOutput<User>> {
    const query = this.repository
      .createQueryBuilder('entity')
      .innerJoinAndSelect('entity.role', 'role')
      .orderBy('entity.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    /*
      ⚠️ **Cada palavra tem de casar** (card 02 de `tela-de-usuarios`) — com o
      nome completo, o nome social completo ou o email. Antes o termo inteiro
      tinha de caber num campo só, e "Maria Silva" não achava ninguém.

      ⚠️ `COALESCE`: `CONCAT` com `NULL` dá `NULL`, e quem não tem nome social
      sumiria da busca pelo nome completo.
    */
    palavrasDaBusca(name).forEach((palavra, i) => {
      query.andWhere(
        new Brackets((qb) =>
          qb
            .where(`CONCAT(entity.firstName, ' ', entity.lastName) LIKE :p${i}`)
            .orWhere(
              `CONCAT(COALESCE(entity.socialName, ''), ' ', entity.lastName) LIKE :p${i}`,
            )
            .orWhere(`entity.email LIKE :p${i}`),
        ),
        { [`p${i}`]: `%${palavra}%` },
      );
    });

    if (roleId) {
      query.andWhere('role.id = :roleId', { roleId });
    }

    // ⚠️ `INNER JOIN`: com o cursinho, só quem é colaborador dele — e o
    // `collaborator` vem junto, para a tela dizer quem está ativo.
    if (partnerId) {
      query
        .innerJoinAndSelect('entity.collaborator', 'collaborator')
        .innerJoin('collaborator.partnerPrepCourse', 'cursinho')
        .andWhere('cursinho.id = :partnerId', { partnerId });
    }

    // ⚠️ Lista e contagem da MESMA consulta — antes o `count` era montado à
    // parte, repetindo o filtro, e podia divergir.
    const [data, totalItems] = await query.getManyAndCount();

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

  async aggregateUsersByRole(
    partnerId?: string,
    baseOnly?: boolean,
  ): Promise<AggregateUsersByRoleDtoOutput[]> {
    const qb = this.repository
      .createQueryBuilder('u')
      .innerJoin('u.role', 'r')
      .select('r.name', 'name')
      .addSelect('COUNT(*)', 'total');

    if (partnerId) {
      qb.innerJoin('r.partnerPrepCourse', 'ppc').andWhere(
        'ppc.id = :partnerId',
        { partnerId },
      );
    }

    if (baseOnly) {
      qb.andWhere('r.base = :base', { base: true });
    }

    return (await qb
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
      .limit(20)
      .getMany();
  }
}
