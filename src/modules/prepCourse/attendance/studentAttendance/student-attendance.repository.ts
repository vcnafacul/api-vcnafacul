import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager } from 'typeorm';
import { StudentAttendance } from './student-attendance.entity';

@Injectable()
export class StudentAttendanceRepository extends BaseRepository<StudentAttendance> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(StudentAttendance));
  }

  async findOneBy(where: object): Promise<StudentAttendance> {
    return await this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.justification', 'justification')
      .where({ ...where })
      .getOne();
  }

  async findAllByAttendanceRecordsWithJustification(
    studentCourseId: string,
    attendanceRecordIds: string[],
  ): Promise<StudentAttendance[]> {
    return await this.repository
      .createQueryBuilder('studentAttendance')
      .innerJoin('studentAttendance.studentCourse', 'studentCourse')
      .leftJoinAndSelect('studentAttendance.justification', 'justification')
      .leftJoinAndSelect(
        'studentAttendance.attendanceRecord',
        'attendanceRecord',
      )
      .where('attendanceRecord.id IN (:...ids)', {
        ids: attendanceRecordIds,
      })
      .andWhere('studentCourse.id = :id', { id: studentCourseId })
      .getMany();
  }
}
