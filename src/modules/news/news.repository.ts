import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { News } from './news.entity';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';

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
}
