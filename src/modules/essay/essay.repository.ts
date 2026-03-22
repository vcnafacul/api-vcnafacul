import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { Essay } from './entities/essay.entity';
import { EssayReview } from './entities/essay-review.entity';

@Injectable()
export class EssayRepository extends BaseRepository<Essay> {
  private readonly reviewRepo;

  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(Essay));
    this.reviewRepo = _entityManager.getRepository(EssayReview);
  }

  findEssayById(id: string): Promise<Essay | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['theme', 'reviews', 'reviews.reviewer'],
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
        .leftJoinAndSelect('essay.reviews', 'reviews')
        .leftJoinAndSelect('reviews.reviewer', 'reviewer')
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

  createReview(data: Partial<EssayReview>): EssayReview {
    return this.reviewRepo.create(data);
  }

  saveReview(review: EssayReview): Promise<EssayReview> {
    return this.reviewRepo.save(review);
  }

  private applyEssayFilters(
    qb: any,
    filters: { themeId?: string; status?: string; search?: string },
  ): void {
    if (filters.themeId) {
      qb.andWhere('essay.theme_id = :themeId', { themeId: filters.themeId });
    }
    if (filters.status) {
      qb.andWhere('essay.status = :status', { status: filters.status });
    }
    if (filters.search) {
      qb.andWhere(
        '(user.firstName LIKE :search OR user.lastName LIKE :search OR user.email LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
  }

  async findAllEssays(
    page: number,
    limit: number,
    filters: { themeId?: string; status?: string; search?: string },
  ): Promise<{ data: Essay[]; total: number }> {
    const dataQb = this.repository
      .createQueryBuilder('essay')
      .leftJoinAndSelect('essay.theme', 'theme')
      .leftJoinAndSelect('essay.reviews', 'reviews')
      .leftJoinAndSelect('essay.user', 'user')
      .where('essay.deletedAt IS NULL');
    this.applyEssayFilters(dataQb, filters);

    const countQb = this.repository
      .createQueryBuilder('essay')
      .leftJoin('essay.user', 'user')
      .where('essay.deletedAt IS NULL');
    this.applyEssayFilters(countQb, filters);

    const [data, total] = await Promise.all([
      dataQb
        .orderBy('essay.submittedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany(),
      countQb.getCount(),
    ]);
    return { data, total };
  }

  async findEssaysByPrepCourse(
    prepCourseId: string,
    page: number,
    limit: number,
    filters: { themeId?: string; status?: string; search?: string },
  ): Promise<{ data: Essay[]; total: number }> {
    const dataQb = this.repository
      .createQueryBuilder('essay')
      .leftJoinAndSelect('essay.theme', 'theme')
      .leftJoinAndSelect('essay.reviews', 'reviews')
      .leftJoinAndSelect('essay.user', 'user')
      .innerJoin(
        'student_course',
        'sc',
        'sc.user_id = essay.user_id AND sc.partner_prep_course_id = :prepCourseId',
        { prepCourseId },
      )
      .where('essay.deletedAt IS NULL');
    this.applyEssayFilters(dataQb, filters);

    const countQb = this.repository
      .createQueryBuilder('essay')
      .leftJoin('essay.user', 'user')
      .innerJoin(
        'student_course',
        'sc',
        'sc.user_id = essay.user_id AND sc.partner_prep_course_id = :prepCourseId',
        { prepCourseId },
      )
      .where('essay.deletedAt IS NULL');
    this.applyEssayFilters(countQb, filters);

    const [data, total] = await Promise.all([
      dataQb
        .orderBy('essay.submittedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany(),
      countQb.getCount(),
    ]);
    return { data, total };
  }

  async updateEssayStatus(essayId: string, status: string): Promise<void> {
    await this.repository.update(essayId, { status } as any);
  }

  async findReviewsByEssayId(essayId: string): Promise<EssayReview[]> {
    return this.reviewRepo.find({
      where: { essayId },
      relations: ['reviewer'],
      order: { createdAt: 'ASC' },
    });
  }
}
