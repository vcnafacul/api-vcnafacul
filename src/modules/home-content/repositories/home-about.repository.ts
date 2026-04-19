import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { HomeAbout } from '../entities/home-about.entity';

@Injectable()
export class HomeAboutRepository {
  private readonly repository: Repository<HomeAbout>;

  constructor(@InjectEntityManager() entityManager: EntityManager) {
    this.repository = entityManager.getRepository(HomeAbout);
  }

  findSingleton(): Promise<HomeAbout | null> {
    return this.repository.findOne({ where: {}, order: { id: 'ASC' } });
  }

  save(entity: HomeAbout): Promise<HomeAbout> {
    return this.repository.save(entity);
  }
}
