import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { Brackets, EntityManager } from 'typeorm';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { Geolocation } from './geo.entity';

@Injectable()
export class GeoRepository extends BaseRepository<Geolocation> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(Geolocation));
  }

  override async findAllBy({
    page,
    limit,
    where,
    or,
  }: GetAllWhereInput): Promise<GetAllOutput<Geolocation>> {
    const query = this.repository
      .createQueryBuilder('entity')
      .orderBy('entity.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .where({ ...where });

    const queryTotalItems = await this.repository
      .createQueryBuilder('entity')
      .where({ ...where });

    if (or?.length > 0) {
      query.andWhere(
        new Brackets((qb) => {
          or?.map((o) => {
            qb.orWhere(`LOWER(entity.${o.prop}) LIKE LOWER(:text)`, {
              text: `%${o.value}%`,
            });
          });
        }),
      );

      queryTotalItems.andWhere(
        new Brackets((qb) => {
          or?.map((o) => {
            qb.orWhere(`LOWER(entity.${o.prop}) LIKE LOWER(:text)`, {
              text: `%${o.value}%`,
            });
          });
        }),
      );
    }

    const totalItems = await queryTotalItems.getCount();
    const data = await query
      .leftJoinAndSelect('entity.logs', 'logs')
      .leftJoin('logs.user', 'user')
      .addSelect([
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.phone',
      ])
      .getMany();
    return {
      data,
      page,
      limit,
      totalItems,
    };
  }

  async create(geo: Geolocation): Promise<Geolocation> {
    return await this.repository.save(geo);
  }

  async findOneBy(where: object): Promise<Geolocation> {
    return await this.repository.findOneBy(where);
  }

  async update(geo: Geolocation) {
    this.repository.save(geo);
  }
}
