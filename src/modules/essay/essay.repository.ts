import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { Essay } from './entities/essay.entity';
import { EssayAIReview } from './entities/essay-ai-review.entity';

@Injectable()
export class EssayRepository extends BaseRepository<Essay> {
  private readonly aiReviewRepo;

  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(Essay));
    this.aiReviewRepo = _entityManager.getRepository(EssayAIReview);
  }

  findEssayById(id: string): Promise<Essay | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['theme', 'aiReview'],
    });
  }

  findByUserAndTheme(userId: string, themeId: string): Promise<Essay | null> {
    return this.repository.findOne({ where: { userId, themeId } });
  }

  async findByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: Essay[]; total: number }> {
    const [data, totalItems] = await Promise.all([
      this.repository
        .createQueryBuilder('essay')
        .leftJoinAndSelect('essay.theme', 'theme')
        .leftJoinAndSelect('essay.aiReview', 'aiReview')
        .where('essay.user_id = :userId', { userId })
        .andWhere('essay.deletedAt IS NULL')
        .orderBy('essay.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany(),
      this.repository
        .createQueryBuilder('essay')
        .where('essay.user_id = :userId', { userId })
        .andWhere('essay.deletedAt IS NULL')
        .getCount(),
    ]);
    return { data, total: totalItems };
  }

  createAIReview(data: Partial<EssayAIReview>): EssayAIReview {
    return this.aiReviewRepo.create(data);
  }

  saveAIReview(review: EssayAIReview): Promise<EssayAIReview> {
    return this.aiReviewRepo.save(review);
  }
}
