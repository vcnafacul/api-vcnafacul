import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { NodeRepository } from 'src/shared/modules/node/node.repository';
import { EntityManager } from 'typeorm';
import { StatusApplication } from './enums/stastusApplication';
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
    orderBy,
    filters,
  }: GetAllWhereInput): Promise<GetAllOutput<StudentCourse>> {
    let queryBuilder = this.repository
      .createQueryBuilder('entity')
      .skip((page - 1) * limit)
      .take(limit)
      .leftJoinAndSelect('entity.class', 'class')
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
        'users.birthday',
      ])
      .where({ ...where });

    let queryBuilderCount = this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.class', 'class')
      .innerJoin('entity.user', 'users')
      .addSelect(['users.birthday'])
      .where({ ...where });

    if (orderBy) {
      queryBuilder = queryBuilder.orderBy(
        `entity.${orderBy.field}`,
        orderBy.sort,
      );
    } else {
      queryBuilder = queryBuilder.orderBy('entity.cod_enrolled', 'DESC');
    }

    if (filters && filters.length > 0) {
      filters.forEach((filter) => {
        if (filter.field === 'class') {
          const query = `class.name LIKE "%${filter.value}%"`;
          queryBuilder = queryBuilder.andWhere(query);
          queryBuilderCount = queryBuilderCount.andWhere(query);
        } else if (filter.field === 'birthday') {
          const dateValue = new Date(filter.value).toISOString().slice(0, 10); // "YYYY-MM-DD"
          if (filter.operator === 'is') {
            queryBuilder = queryBuilder.andWhere(
              'DATE(users.birthday) = :birthday',
              { birthday: dateValue },
            );
            queryBuilderCount = queryBuilderCount.andWhere(
              'DATE(users.birthday) = :birthday',
              { birthday: dateValue },
            );
          } else if (filter.operator === 'after') {
            queryBuilder = queryBuilder.andWhere(
              'DATE(users.birthday) > :birthday',
              { birthday: dateValue },
            );
            queryBuilderCount = queryBuilderCount.andWhere(
              'DATE(users.birthday) > :birthday',
              { birthday: dateValue },
            );
          } else if (filter.operator === 'before') {
            queryBuilder = queryBuilder.andWhere(
              'DATE(users.birthday) < :birthday',
              { birthday: dateValue },
            );
            queryBuilderCount = queryBuilderCount.andWhere(
              'DATE(users.birthday) < :birthday',
              { birthday: dateValue },
            );
          }
        } else {
          const query = `entity.${filter.field} LIKE "%${filter.value}%"`;
          queryBuilder = queryBuilder.andWhere(query);
          queryBuilderCount = queryBuilderCount.andWhere(query);
        }
      });
    }

    const [data, totalItems] = await Promise.all([
      queryBuilder.getMany(),
      queryBuilderCount.getCount(),
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
      .leftJoinAndSelect('entity.class', 'class')
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
        applicationStatus: StatusApplication.CalledForEnrollment,
        selectEnrolled: false,
        updatedAt: new Date(),
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

  async findAllCompletedBy(where: object): Promise<StudentCourse[]> {
    return await this.repository
      .createQueryBuilder('entity')
      .where({ ...where })
      .innerJoin('entity.user', 'users')
      .addSelect([
        'users.firstName',
        'users.lastName',
        'users.socialName',
        'users.email',
        'entity.isFree',
      ])
      .innerJoinAndSelect('entity.partnerPrepCourse', 'partnerPrepCourse')
      .innerJoinAndSelect('partnerPrepCourse.geo', 'geo')
      .getMany();
  }

  async findOneToSendEmail(id: string): Promise<StudentCourse> {
    return await this.repository
      .createQueryBuilder('entity')
      .where({ id })
      .innerJoin('entity.user', 'users')
      .addSelect([
        'users.firstName',
        'users.lastName',
        'users.socialName',
        'users.email',
      ])
      .innerJoinAndSelect('entity.partnerPrepCourse', 'partnerPrepCourse')
      .innerJoinAndSelect('partnerPrepCourse.geo', 'geo')
      .leftJoinAndSelect('entity.logs', 'logs')
      .getOne();
  }

  async getNotConfirmedEnrolled(): Promise<StudentCourse[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return await this.repository
      .createQueryBuilder('entity')
      .where('limitEnrolledAt = :today', { today })
      .andWhere('applicationStatus = :status', {
        status: StatusApplication.CalledForEnrollment,
      })
      .getMany();
  }

  async notConfirmedEnrolled() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.repository
      .createQueryBuilder('entity')
      .update()
      .set({
        applicationStatus: StatusApplication.MissedDeadline,
        updatedAt: new Date(),
      })
      .where('limitEnrolledAt = :today', { today })
      .andWhere('applicationStatus = :status', {
        status: StatusApplication.CalledForEnrollment,
      })
      .execute();
  }
}
