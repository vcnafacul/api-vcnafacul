import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EntityManager } from 'typeorm';
import { AttendanceRecord } from './attendance-record.entity';
import { AttendanceRecordItem } from './dtos/attendance-record-by-class.dto.output';

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
        'userRegisteredBy.socialName',
        'userRegisteredBy.useSocialName',
        'userRegisteredBy.email',
      ])
      .leftJoin('entity.studentAttendance', 'studentAttendance')
      .addSelect(['studentAttendance.id', 'studentAttendance.present'])
      .leftJoinAndSelect('studentAttendance.justification', 'justification')
      .innerJoin('studentAttendance.studentCourse', 'studentCourse')
      .addSelect(['studentCourse.id', 'studentCourse.cod_enrolled'])
      .innerJoin('studentCourse.user', 'user')
      .addSelect([
        'user.firstName',
        'user.lastName',
        'user.socialName',
        'user.useSocialName',
      ])
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
        .orderBy('entity.registeredAt', 'DESC')
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

  async dailyAttendanceByClassId(
    classId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AttendanceRecordItem[]> {
    return await this.repository
      .createQueryBuilder('attendance')
      .innerJoin('attendance.class', 'class')
      .innerJoin('attendance.studentAttendance', 'studentAttendance')
      .where('class.id = :classId', { classId })
      .andWhere('attendance.registeredAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('attendance.deletedAt IS NULL')
      .select('attendance.registeredAt', 'date')
      .addSelect('COUNT(studentAttendance.id)', 'total')
      .addSelect(
        `SUM(CASE WHEN studentAttendance.present = true THEN 1 ELSE 0 END)`,
        'presentCount',
      )
      .groupBy('attendance.registeredAt')
      .orderBy('attendance.registeredAt', 'ASC')
      .getRawMany();
  }

  async dailyAttendanceForClassIds(
    classIds: string[],
    partnerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AttendanceRecordItem[]> {
    const query = this.repository
      .createQueryBuilder('attendance')
      .innerJoin('attendance.class', 'class')
      .innerJoin('attendance.studentAttendance', 'studentAttendance')
      .where('attendance.registeredAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('attendance.deletedAt IS NULL')
      .select('class.id', 'classId')
      .addSelect('class.name', 'className')
      .addSelect('attendance.registeredAt', 'date')
      .addSelect('COUNT(studentAttendance.id)', 'total')
      .addSelect(
        `SUM(CASE WHEN studentAttendance.present = true THEN 1 ELSE 0 END)`,
        'presentCount',
      )
      .groupBy('class.id')
      .addGroupBy('class.name')
      .addGroupBy('attendance.registeredAt')
      .orderBy('class.name', 'ASC')
      .addOrderBy('attendance.registeredAt', 'ASC');

    if (classIds.length > 0) {
      query.andWhere('class.id IN (:...classIds)', { classIds });
    } else {
      query.andWhere('class.partnerPrepCourse = :partnerId', { partnerId });
    }

    return await query.getRawMany();
  }

  async findByClassIdAndDate(
    classId: string,
    date: Date,
  ): Promise<AttendanceRecord | null> {
    const formattedDate = (date as unknown as string).split('T')[0]; // yyyy-MM-dd

    return await this.repository
      .createQueryBuilder('entity')
      .innerJoin('entity.class', 'class')
      .where('class.id = :classId', { classId })
      .andWhere('DATE(entity.registeredAt) = :date', { date: formattedDate })
      .andWhere('entity.deletedAt IS NULL')
      .getOne();
  }

  async studentAttendanceReportByClassId(
    classId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    {
      name: string;
      socialName: string;
      useSocialName: boolean;
      codEnrolled: string;
      totalClassRecords: number;
      studentRecords: number;
      presencePercentage: number;
    }[]
  > {
    const endDateCopy = new Date(endDate);
    endDateCopy.setDate(endDateCopy.getDate() + 1);

    // Subquery: total de registros da turma no período
    const totalClassRecordsSubquery = this.repository
      .createQueryBuilder('attendance')
      .select('COUNT(attendance.id)', 'total')
      .where('attendance.class = :classId', { classId })
      .andWhere('attendance.registeredAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate: endDateCopy,
      })
      .andWhere('attendance.deletedAt IS NULL');

    const totalClassRecords = await totalClassRecordsSubquery.getRawOne();

    return await this.repository
      .createQueryBuilder('attendance')
      .innerJoin('attendance.studentAttendance', 'studentAttendance')
      .innerJoin('studentAttendance.studentCourse', 'studentCourse')
      .innerJoin('studentCourse.user', 'user')
      .where('attendance.class = :classId', { classId })
      .andWhere('attendance.registeredAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate: endDateCopy,
      })
      .andWhere('attendance.deletedAt IS NULL')
      .select('user.firstName', 'name')
      .addSelect('user.socialName', 'socialName')
      .addSelect('user.useSocialName', 'useSocialName')
      .addSelect('studentCourse.cod_enrolled', 'codEnrolled')
      .addSelect('COUNT(studentAttendance.id)', 'totalClassRecords')
      .addSelect(
        `SUM(CASE WHEN studentAttendance.present = true THEN 1 ELSE 0 END)`,
        'studentRecords',
      )
      .addSelect(
        `ROUND(100.0 * SUM(CASE WHEN studentAttendance.present = true THEN 1 ELSE 0 END) / ${totalClassRecords.total}, 2)`,
        'presencePercentage',
      )
      .groupBy('user.firstName')
      .addGroupBy('studentCourse.cod_enrolled')
      .orderBy('presencePercentage', 'DESC')
      .getRawMany();
  }
}
