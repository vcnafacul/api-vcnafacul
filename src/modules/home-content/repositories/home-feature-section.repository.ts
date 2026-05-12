import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { HomeFeatureSection } from '../entities/home-feature-section.entity';

@Injectable()
export class HomeFeatureSectionRepository {
  private readonly repository: Repository<HomeFeatureSection>;

  constructor(@InjectEntityManager() em: EntityManager) {
    this.repository = em.getRepository(HomeFeatureSection);
  }

  findSingleton(): Promise<HomeFeatureSection | null> {
    return this.repository.findOne({ where: {}, order: { id: 'ASC' } });
  }

  save(entity: HomeFeatureSection): Promise<HomeFeatureSection> {
    return this.repository.save(entity);
  }
}
