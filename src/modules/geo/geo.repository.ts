import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EntityManager } from 'typeorm';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { Geolocation } from './geo.entity';
import { GetAllGeoInput } from './interfaces/get-all-geo.input';

@Injectable()
export class GeoRepository extends BaseRepository<Geolocation> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(Geolocation));
  }

  override async findAll({
    page,
    limit,
    where,
  }: GetAllGeoInput): Promise<GetAllOutput<Geolocation>> {
    const [data, totalItems] = await Promise.all([
      this.repository
        .createQueryBuilder('entity')
        .orderBy('entity.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .where({ ...where })
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
