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
      .addSelect([
        'inscription_course.id',
        'inscription_course.name',
        'inscription_course.description',
        'inscription_course.actived',
        'inscription_course.endDate',
        'inscription_course.startDate',
      ])
      .innerJoinAndSelect('partner_prep_course.geo', 'geo')
      .leftJoinAndSelect('partner_prep_course.members', 'members')
      .leftJoin('members.user', 'user')
      .addSelect(['user.id', 'user.email'])
      .getOne();
  }

  async findOneByUserId(id: string): Promise<PartnerPrepCourse> {
    return await this.repository
      .createQueryBuilder('partner_prep_course')
      .leftJoin('partner_prep_course.inscriptionCourses', 'inscription_course')
      .addSelect([
        'inscription_course.id',
        'inscription_course.actived',
        'inscription_course.endDate',
      ])
      .innerJoinAndSelect('partner_prep_course.geo', 'geo')
      .leftJoinAndSelect('partner_prep_course.members', 'members')
      .leftJoin('members.user', 'user')
      .addSelect(['user.id', 'user.email'])
      .where('user.id = :id', { id })
      .getOne();
  }
}
