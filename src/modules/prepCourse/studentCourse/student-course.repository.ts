import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { NodeRepository } from 'src/shared/modules/node/node.repository';
import { EntityManager } from 'typeorm';
import { StudentCourse } from './student-course.entity';

@Injectable()
export class StudentCourseRepository extends NodeRepository<StudentCourse> {
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

  override async findOneBy(where: object): Promise<StudentCourse> {
    return await this.repository
      .createQueryBuilder('entity')
      .where({ ...where })
      .leftJoinAndSelect('entity.inscriptionCourse', 'inscriptionCourse')
      .getOne();
  }

  async scheduleEnrolled(
    studentsId: string[],
    data_start: Date,
    data_end: Date,
  ) {
    if (!studentsId || studentsId.length === 0) {
      throw new Error('The studentsId list cannot be empty.');
    }

    await this.repository
      .createQueryBuilder('entity')
      .update()
      .set({
        selectEnrolledAt: data_start,
        limitEnrolledAt: data_end,
        selectEnrolled: false,
      })
      .where('id IN (:...studentsId)', { studentsId })
      .execute();
  }

  async getLastEnrollmentCode(): Promise<string | null> {
    const lastCode = await this.repository
      .createQueryBuilder('student_course')
      .select('student_course.cod_enrolled')
      .where('student_course.cod_enrolled IS NOT NULL') // Certifique-se de buscar apenas códigos existentes
      .orderBy('student_course.cod_enrolled', 'DESC') // Ordena decrescente
      .limit(1) // Apenas o último registro
      .getOne();

    return lastCode ? lastCode.cod_enrolled : null;
  }
}
