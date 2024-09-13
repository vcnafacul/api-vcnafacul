import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager } from 'typeorm';
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
    return this.repository
      .createQueryBuilder('entity')
      .where({ ...where })
      .innerJoin('inscription_course.students', 'student_course')
      .addSelect([
        'student_course.id',
        'student_course.userId',
        'student_course.rg',
        'student_course.uf',
        'student_course.cpf',
        'student_course.urgencyPhone',
      ])
      .innerJoin('student_course.user', 'user')
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
}
