import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager } from 'typeorm';
import { PartnerPrepCourse } from './partner-prep-course.entity';

@Injectable()
export class PartnerPrepCourseRepository extends BaseRepository<PartnerPrepCourse> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(PartnerPrepCourse));
  }

  override async findOneBy(where: object): Promise<PartnerPrepCourse> {
    return await this.repository
      .createQueryBuilder('partner_prep_course')
      .where({ ...where })
      .leftJoin('partner_prep_course.inscriptionCourses', 'inscription_course')
      .addSelect(['inscription_course.id', 'inscription_course.actived'])
      .innerJoinAndSelect('partner_prep_course.geo', 'geo')
      .getOne();
  }
}
