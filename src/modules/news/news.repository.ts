import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager } from 'typeorm';
import { News } from './news.entity';

@Injectable()
export class NewsRepository extends BaseRepository<News> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(News));
  }

  async delete(id: string) {
    const news = await this.repository.findOneBy({ id });
    news.actived = false;
    await this.repository.save(news);
  }

  async getTotalEntity() {
    return this.repository
      .createQueryBuilder('entity')
      .where('entity.deletedAt IS NULL')
      .getCount();
  }
}
