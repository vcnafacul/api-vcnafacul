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
    if (news) {
      news.actived = false;
      await this.repository.save(news);
    }
  }

  /** Novidades ativas e não expiradas (expire_at null ou >= hoje). */
  async findActivedNotExpired() {
    const qb = this.repository
      .createQueryBuilder('entity')
      .where('entity.deletedAt IS NULL')
      .andWhere('entity.actived = :actived', { actived: true })
      .andWhere('(entity.expire_at IS NULL OR entity.expire_at >= :today)', {
        today: new Date().toISOString().slice(0, 10),
      })
      .orderBy('entity.createdAt', 'DESC');
    return qb.getMany();
  }

  /** Novidades ativas com expire_at < before (para o cron). */
  async findExpiredBefore(before: Date): Promise<News[]> {
    return this.repository
      .createQueryBuilder('entity')
      .where('entity.deletedAt IS NULL')
      .andWhere('entity.actived = :actived', { actived: true })
      .andWhere('entity.expire_at IS NOT NULL')
      .andWhere('entity.expire_at < :before', {
        before: before.toISOString().slice(0, 10),
      })
      .getMany();
  }

  async getTotalEntity() {
    return this.repository
      .createQueryBuilder('entity')
      .where('entity.deletedAt IS NULL')
      .getCount();
  }
}
