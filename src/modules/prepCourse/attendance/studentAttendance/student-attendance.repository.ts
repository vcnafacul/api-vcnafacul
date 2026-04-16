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

  async findOneWithClass(id: string): Promise<StudentAttendance> {
    return await this.repository
      .createQueryBuilder('sa')
      .innerJoinAndSelect('sa.attendanceRecord', 'ar')
      .innerJoinAndSelect('ar.class', 'class')
      .where('sa.id = :id', { id })
      .getOne();
  }

  async countByStudentCourseId(
    studentCourseId: string,
  ): Promise<{ presencas: number; faltas: number }> {
    const result = await this.repository
      .createQueryBuilder('sa')
      .select('SUM(CASE WHEN sa.present = true THEN 1 ELSE 0 END)', 'presencas')
      .addSelect(
        'SUM(CASE WHEN sa.present = false THEN 1 ELSE 0 END)',
        'faltas',
      )
      .innerJoin('sa.studentCourse', 'sc')
      .where('sc.id = :studentCourseId', { studentCourseId })
      .getRawOne();

    return {
      presencas: parseInt(result?.presencas ?? '0', 10),
      faltas: parseInt(result?.faltas ?? '0', 10),
    };
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
