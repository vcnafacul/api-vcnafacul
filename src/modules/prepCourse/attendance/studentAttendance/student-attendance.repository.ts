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
}
