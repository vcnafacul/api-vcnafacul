import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EntityManager } from 'typeorm';
import { CoursePeriod } from './course-period.entity';

@Injectable()
export class CoursePeriodRepository extends BaseRepository<CoursePeriod> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(CoursePeriod));
  }

  async delete(id: string): Promise<void> {
    const coursePeriod = await this.repository.findOneBy({ id });
    if (!coursePeriod) {
      throw new Error(`Course period not found by id ${id}`);
    }
    coursePeriod.deletedAt = new Date();
    await this.repository.save(coursePeriod);
  }

  async findOneByUserId(userId: string): Promise<CoursePeriod[]> {
    return await this.repository
      .createQueryBuilder('course_period')
      .innerJoin('course_period.partnerPrepCourse', 'partner_prep_course')
      .innerJoin('partner_prep_course.representative', 'user')
      .where('user.id = :userId', { userId })
      .orderBy('course_period.year', 'DESC')
      .addOrderBy('course_period.startDate', 'DESC')
      .getMany();
  }

  async findOneById(id: string): Promise<CoursePeriod> {
    return await this.repository
      .createQueryBuilder('course_period')
      .leftJoinAndSelect(
        'course_period.partnerPrepCourse',
        'partner_prep_course',
      )
      .leftJoinAndSelect('course_period.classes', 'classes')
      .where('course_period.id = :id', { id })
      .andWhere('course_period.deletedAt IS NULL')
      .getOne();
  }

  async findAllBy({
    page,
    limit,
    where,
  }: GetAllWhereInput): Promise<GetAllOutput<CoursePeriod>> {
    const queryBuilder = this.repository
      .createQueryBuilder('course_period')
      .leftJoinAndSelect(
        'course_period.partnerPrepCourse',
        'partner_prep_course',
      )
      .leftJoinAndSelect('course_period.classes', 'classes')
      .leftJoinAndSelect('classes.students', 'students')
      .loadRelationCountAndMap(
        'course_period.classesCount',
        'course_period.classes',
      );

    if (where) {
      Object.keys(where).forEach((key) => {
        if (where[key] !== undefined && where[key] !== null) {
          queryBuilder.andWhere(`course_period.${key} = :${key}`, {
            [key]: where[key],
          });
        }
      });
    }

    const totalItems = await queryBuilder.getCount();
    const data = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      page,
      limit,
      totalItems,
    };
  }

  async findExpiredPeriods(): Promise<CoursePeriod[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Final do dia atual

    return await this.repository
      .createQueryBuilder('course_period')
      .leftJoinAndSelect('course_period.classes', 'classes')
      .leftJoinAndSelect('classes.students', 'students')
      .where('course_period.endDate <= :today', { today })
      .andWhere('course_period.deletedAt IS NULL')
      .getMany();
  }
}
