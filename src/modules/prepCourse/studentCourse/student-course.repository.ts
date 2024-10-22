import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EntityManager } from 'typeorm';
import { StudentCourse } from './student-course.entity';

@Injectable()
export class StudentCourseRepository extends BaseRepository<StudentCourse> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(StudentCourse));
  }

  override async findAllBy({
    page,
    limit,
    where,
  }: GetAllWhereInput): Promise<GetAllOutput<StudentCourse>> {
    const [data, totalItems] = await Promise.all([
      this.repository
        .createQueryBuilder('entity')
        .orderBy('entity.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .where({ ...where })
        .innerJoin('entity.user', 'users')
        .addSelect([
          'users.id',
          'users.firstName',
          'users.lastName',
          'users.socialName',
          'users.email',
          'users.phone',
          'users.state',
          'users.city',
        ])
        .getMany(),
      this.repository
        .createQueryBuilder('entity')
        .where({ ...where })
        .getCount(),
    ]);
    return {
      data,
      page,
      limit,
      totalItems,
    };
  }
}
