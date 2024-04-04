import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
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
