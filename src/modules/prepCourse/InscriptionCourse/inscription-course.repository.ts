import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager } from 'typeorm';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';
import { InscriptionCourse } from './inscription-course.entity';

@Injectable()
export class InscriptionCourseRepository extends BaseRepository<InscriptionCourse> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(InscriptionCourse));
  }

  override async findOneBy(where: object): Promise<InscriptionCourse> {
    return await this.repository
      .createQueryBuilder('inscription_course')
      .where({ ...where })
      .leftJoin('inscription_course.students', 'student_course')
      .addSelect([
        'student_course.id',
        'student_course.userId',
        'student_course.rg',
        'student_course.uf',
        'student_course.cpf',
        'student_course.urgencyPhone',
      ])
      .leftJoin('student_course.user', 'user')
      .addSelect([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.socialName',
        'user.email',
        'user.phone',
        'user.birthday',
        'user.gender',
        'user.state',
        'user.city',
      ])
      .getOne();
  }

  async findActived(
    partnerPrepCourse: PartnerPrepCourse,
  ): Promise<InscriptionCourse> {
    return await this.repository
      .createQueryBuilder('inscription_course')
      .where({
        partnerPrepCourse,
        actived: true,
      })
      .leftJoin('inscription_course.students', 'student_course')
      .addSelect(['student_course.userId'])
      .getOne();
  }
}
