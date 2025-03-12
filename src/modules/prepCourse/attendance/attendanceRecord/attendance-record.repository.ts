import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EntityManager } from 'typeorm';
import { AttendanceRecord } from './attendance-record.entity';

@Injectable()
export class AttendanceRecordRepository extends BaseRepository<AttendanceRecord> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(AttendanceRecord));
  }

  async findOneBy(where: object): Promise<AttendanceRecord> {
    return await this.repository
      .createQueryBuilder('entity')
      .innerJoinAndSelect('entity.registeredBy', 'registeredBy')
      .innerJoin('registeredBy.user', 'userRegisteredBy')
      .addSelect([
        'userRegisteredBy.firstName',
        'userRegisteredBy.lastName',
        'userRegisteredBy.email',
      ])
      .leftJoin('entity.studentAttendance', 'studentAttendance')
      .addSelect(['studentAttendance.id', 'studentAttendance.present'])
      .leftJoinAndSelect('studentAttendance.justification', 'justification')
      .innerJoin('studentAttendance.studentCourse', 'studentCourse')
      .addSelect(['studentCourse.id', 'studentCourse.cod_enrolled'])
      .innerJoin('studentCourse.user', 'user')
      .addSelect(['user.firstName', 'user.lastName'])
      .innerJoinAndSelect('entity.class', 'class')
      .where({ ...where })
      .getOne();
  }

  async findManyByStudentId(
    page: number,
    limit: number,
    id: string,
    studentCourseId: string,
  ): Promise<GetAllOutput<AttendanceRecord>> {
    const [data, totalItems] = await Promise.all([
      this.repository
        .createQueryBuilder('entity')
        .leftJoin('entity.studentAttendance', 'studentAttendance')
        .addSelect(['studentAttendance.id', 'studentAttendance.present'])
        .innerJoin('studentAttendance.studentCourse', 'studentCourse')
        .addSelect(['studentCourse.id', 'studentCourse.cod_enrolled'])
        .leftJoinAndSelect('studentAttendance.justification', 'justification')
        .innerJoin('entity.class', 'class')
        .addSelect(['class.id'])
        .where('studentCourse.id = :studentCourseId', { studentCourseId })
        .andWhere('entity.class.id = :classId', { classId: id })
        .andWhere('entity.deletedAt IS NULL')
        .skip((page - 1) * limit)
        .take(limit)
        .getMany(),

      this.repository
        .createQueryBuilder('entity')
        .leftJoin('entity.studentAttendance', 'studentAttendance')
        .innerJoin('studentAttendance.studentCourse', 'studentCourse')
        .where('studentCourse.id = :studentCourseId', { studentCourseId })
        .innerJoin('entity.class', 'class')
        .andWhere('entity.class.id = :classId', { classId: id })
        .andWhere('entity.deletedAt IS NULL')
        .getCount(),
    ]);

    return {
      data,
      page,
      limit,
      totalItems,
    };
  }

  async findAllBy({
    page,
    limit,
    where,
  }: GetAllWhereInput): Promise<GetAllOutput<AttendanceRecord>> {
    const [data, totalItems] = await Promise.all([
      this.repository
        .createQueryBuilder('entity')
        .orderBy('entity.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .innerJoinAndSelect('entity.registeredBy', 'registeredBy')
        .innerJoin('registeredBy.user', 'userRegisteredBy')
        .addSelect(['userRegisteredBy.firstName', 'userRegisteredBy.lastName'])
        .where({ ...where })
        .andWhere('entity.deletedAt IS NULL')
        .getMany(),
      this.repository
        .createQueryBuilder('entity')
        .where({ ...where })
        .andWhere('entity.deletedAt IS NULL')
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
