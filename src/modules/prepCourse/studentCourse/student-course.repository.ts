import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { NodeRepository } from 'src/shared/modules/node/node.repository';
import { EntityManager } from 'typeorm';
import { StatusApplication } from './enums/stastusApplication';
import { StudentCourse } from './student-course.entity';
import { Period } from 'src/modules/user/enum/period';
import { AggregateStudentCoursePeriodDtoOutput } from './dtos/aggregate-student-course-period.dto.output';
import { buildFullSeries } from './handler/build-full-series';

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
      .leftJoinAndSelect('class.coursePeriod', 'course_period')
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
        'users.useSocialName',
      ])
      .where({ ...where });

    let queryBuilderCount = this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.class', 'class')
      .leftJoinAndSelect('class.coursePeriod', 'course_period')
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
      .leftJoinAndSelect('class.coursePeriod', 'course_period')
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
      ])
      .innerJoinAndSelect('entity.partnerPrepCourse', 'partnerPrepCourse')
      .innerJoinAndSelect('partnerPrepCourse.geo', 'geo')
      .innerJoin('entity.inscriptionCourse', 'inscriptionCourse')
      .addSelect(['inscriptionCourse.id'])
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
      .innerJoin('entity.inscriptionCourse', 'inscriptionCourse')
      .addSelect(['inscriptionCourse.id'])
      .leftJoinAndSelect('entity.logs', 'logs')
      .getOne();
  }

  async getNotConfirmedEnrolled(): Promise<StudentCourse[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return await this.repository
      .createQueryBuilder('entity')
      .where('entity.limitEnrolledAt <= :today', { today })
      .andWhere('entity.applicationStatus = :status', {
        status: StatusApplication.CalledForEnrollment,
      })
      .getMany();
  }

  async notConfirmedEnrolled() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera a hora para comparar só a data

    await this.repository
      .createQueryBuilder('entity')
      .update()
      .set({
        applicationStatus: StatusApplication.MissedDeadline,
        updatedAt: new Date(),
      })
      .where('limitEnrolledAt <= :today', { today })
      .andWhere('applicationStatus = :status', {
        status: StatusApplication.CalledForEnrollment,
      })
      .execute();
  }

  async getStudentByUserIdAndInscriptionId(
    userId: string,
    inscriptionId: string,
  ) {
    return await this.repository
      .createQueryBuilder('entity')
      .innerJoin('entity.user', 'user')
      .addSelect(['user.id'])
      .innerJoin('entity.inscriptionCourse', 'inscriptionCourse')
      .addSelect(['inscriptionCourse.id'])
      .where('user.id = :userId', { userId })
      .andWhere('inscriptionCourse.id = :inscriptionId', { inscriptionId })
      .getOne();
  }

  async getTotalEntity() {
    return this.repository
      .createQueryBuilder('entity')
      .where('entity.deletedAt IS NULL')
      .getCount();
  }

  async entityByStatus(status: StatusApplication) {
    return this.repository
      .createQueryBuilder('entity')
      .where('entity.deletedAt IS NULL')
      .andWhere('entity.applicationStatus = :status', { status })
      .getCount();
  }

  async updateStudentStatus(
    studentIds: string[],
    status: StatusApplication,
  ): Promise<void> {
    if (!studentIds || studentIds.length === 0) {
      return;
    }

    await this.repository
      .createQueryBuilder('entity')
      .update()
      .set({
        applicationStatus: status,
        updatedAt: new Date(),
      })
      .where('id IN (:...studentIds)', { studentIds })
      .execute();
  }

  async getRegistrationMonitoring(userId: string) {
    return await this.repository
      .createQueryBuilder('entity')
      .where('entity.userId = :userId', { userId })
      .innerJoinAndSelect('entity.inscriptionCourse', 'inscriptionCourse')
      .innerJoinAndSelect('entity.partnerPrepCourse', 'partnerPrepCourse')
      .innerJoinAndSelect('partnerPrepCourse.geo', 'geo')
      .leftJoinAndSelect('entity.logs', 'logs')
      //fazer order by createdAt Asc para logs
      .orderBy('logs.createdAt', 'ASC')
      .addOrderBy('entity.createdAt', 'DESC')
      .getMany();
  }

  async findOneForCertificate(id: string): Promise<StudentCourse> {
    return await this.repository
      .createQueryBuilder('entity')
      .where('entity.id = :id', { id })
      .innerJoinAndSelect('entity.user', 'user')
      .innerJoinAndSelect('entity.partnerPrepCourse', 'partnerPrepCourse')
      .innerJoinAndSelect('partnerPrepCourse.geo', 'geo')
      .innerJoinAndSelect('entity.class', 'class')
      .innerJoinAndSelect('class.coursePeriod', 'course_period')
      .getOne();
  }

  async findOneByCpfAndEnrollmentCode(
    cpf: string,
    enrollmentCode: string,
  ): Promise<StudentCourse> {
    return await this.repository
      .createQueryBuilder('entity')
      .where('entity.cpf = :cpf', { cpf })
      .andWhere('entity.cod_enrolled = :enrollmentCode', { enrollmentCode })
      .innerJoinAndSelect('entity.user', 'user')
      .innerJoinAndSelect('entity.partnerPrepCourse', 'partnerPrepCourse')
      .innerJoinAndSelect('partnerPrepCourse.geo', 'geo')
      .leftJoinAndSelect('entity.class', 'class')
      .leftJoinAndSelect('class.coursePeriod', 'course_period')
      .getOne();
  }

  async existsByUserId(userId: string): Promise<boolean> {
    const count = await this.repository
      .createQueryBuilder('entity')
      .where('entity.user_id = :userId', { userId })
      .getCount();
    return count > 0;
  }

  async findOneWithFullDetails(id: string): Promise<StudentCourse> {
    return await this.repository
      .createQueryBuilder('entity')
      .where('entity.id = :id', { id })
      .leftJoinAndSelect('entity.user', 'user')
      .leftJoinAndSelect('entity.legalGuardian', 'legalGuardian')
      .leftJoinAndSelect('entity.logs', 'logs')
      .leftJoinAndSelect('entity.documents', 'documents')
      .orderBy('logs.created_at', 'DESC')
      .addOrderBy('documents.created_at', 'DESC')
      .getOne();
  }

  async aggregateStudentCourseByPeriod(
    groupBy: Period,
  ): Promise<AggregateStudentCoursePeriodDtoOutput[]> {
    let inscriptionDateExpr: string;
    let enrolmentDateExpr: string;

    switch (groupBy) {
      case 'day':
        inscriptionDateExpr = `DATE_FORMAT(sc.created_at, '%Y-%m-%d')`;
        enrolmentDateExpr = `DATE_FORMAT(sc.selectEnrolledAt, '%Y-%m-%d')`;
        break;

      case 'month':
        inscriptionDateExpr = `DATE_FORMAT(sc.created_at, '%Y-%m')`;
        enrolmentDateExpr = `DATE_FORMAT(sc.selectEnrolledAt, '%Y-%m')`;
        break;

      case 'year':
        inscriptionDateExpr = `CAST(YEAR(sc.created_at) AS CHAR)`;
        enrolmentDateExpr = `CAST(YEAR(sc.selectEnrolledAt) AS CHAR)`;
        break;

      default:
        throw new Error('Invalid groupBy value');
    }

    const inscriptions = await this.repository
      .createQueryBuilder('sc')
      .select(inscriptionDateExpr, 'period')
      .addSelect('COUNT(*)', 'totalInscriptions')
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    const enrolments = await this.repository
      .createQueryBuilder('sc')
      .select(enrolmentDateExpr, 'period')
      .addSelect('COUNT(*)', 'totalEnrolments')
      .where('sc.selectEnrolledAt IS NOT NULL')
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    const periodsMap = new Map<string, AggregateStudentCoursePeriodDtoOutput>();

    for (const row of inscriptions) {
      periodsMap.set(row.period, {
        period: row.period,
        totalInscriptions: Number(row.totalInscriptions),
        totalEnrolments: 0,
        cumulativeEnrolmentsTotal: 0,
        cumulativeInscriptionsTotal: 0,
      });
    }

    for (const row of enrolments) {
      const existing = periodsMap.get(row.period);

      if (existing) {
        existing.totalEnrolments = Number(row.totalEnrolments);
      } else {
        periodsMap.set(row.period, {
          period: row.period,
          totalInscriptions: 0,
          totalEnrolments: Number(row.totalEnrolments),
          cumulativeEnrolmentsTotal: 0,
          cumulativeInscriptionsTotal: 0,
        });
      }
    }

    const sorted = [...periodsMap.values()].sort((a, b) =>
      a.period.localeCompare(b.period),
    );

    const fullSeries = buildFullSeries(groupBy, sorted);

    let cumulativeInscriptions = 0;
    let cumulativeEnrolments = 0;

    return fullSeries.map((item) => {
      cumulativeInscriptions += item.totalInscriptions;
      cumulativeEnrolments += item.totalEnrolments ?? 0;

      return {
        period: item.period,
        totalInscriptions: item.totalInscriptions,
        totalEnrolments: item.totalEnrolments,
        cumulativeInscriptionsTotal: cumulativeInscriptions,
        cumulativeEnrolmentsTotal: cumulativeEnrolments,
      };
    });
  }
}
