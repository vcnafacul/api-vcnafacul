import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { HomeFeature } from '../entities/home-feature.entity';

@Injectable()
export class HomeFeatureRepository {
  private readonly repository: Repository<HomeFeature>;

  constructor(@InjectEntityManager() em: EntityManager) {
    this.repository = em.getRepository(HomeFeature);
  }

  findAllOrdered(): Promise<HomeFeature[]> {
    return this.repository.find({ order: { order: 'ASC', id: 'ASC' } });
  }

  findById(id: number): Promise<HomeFeature | null> {
    return this.repository.findOne({ where: { id } });
  }

  async maxOrder(): Promise<number> {
    const row = await this.repository
      .createQueryBuilder('f')
      .select('MAX(f.order)', 'max')
      .getRawOne<{ max: number | null }>();
    return row?.max ?? 0;
  }

  save(entity: HomeFeature): Promise<HomeFeature> {
    return this.repository.save(entity);
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  async applyOrders(items: { id: number; order: number }[]): Promise<void> {
    if (items.length === 0) return;
    const ids = items.map((i) => i.id);
    const existing = await this.repository.find({ where: { id: In(ids) } });
    const byId = new Map(existing.map((e) => [e.id, e]));
    for (const { id, order } of items) {
      const entity = byId.get(id);
      if (entity) {
        entity.order = order;
      }
    }
    await this.repository.save(Array.from(byId.values()));
  }
}
