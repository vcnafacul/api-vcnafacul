import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
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
}
