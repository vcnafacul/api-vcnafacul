import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
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

  async findOneById(id: string): Promise<PartnerPrepCourse> {
    return await this.repository
      .createQueryBuilder('partner_prep_course')
      .innerJoinAndSelect('partner_prep_course.geo', 'geo')
      .innerJoinAndSelect(
        'partner_prep_course.representative',
        'representative',
      )
      .leftJoinAndSelect('partner_prep_course.members', 'members')
      .select(['members.id'])
      .addSelect('COALESCE(COUNT(members.id), 0)', 'numberMembers')
      .leftJoin('partner_prep_course.students', 'student_course')
      .addSelect('COALESCE(COUNT(student_course.id), 0)', 'numberStudents')
      .orderBy('partner_prep_course.createdAt', 'DESC')
      .where('partner_prep_course.id = :id', { id })
      .getOne();
  }

  async findAllBy({
    page,
    limit,
    where,
  }: GetAllWhereInput): Promise<GetAllOutput<PartnerPrepCourse>> {
    const [data, totalItems] = await Promise.all([
      this.repository
        .createQueryBuilder('partner_prep_course')
        .innerJoin('partner_prep_course.geo', 'geo')
        .addSelect([
          'geo.id',
          'geo.name',
          'geo.category',
          'geo.city',
          'geo.state',
          'geo.phone',
        ])
        .innerJoin('partner_prep_course.representative', 'representative')
        .addSelect(['representative.id', 'representative.name'])
        .orderBy('partner_prep_course.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .where({ ...where })
        .getMany(),
      this.repository.count({ where }),
    ]);
    return {
      data,
      page,
      limit,
      totalItems,
    };
  }
}
