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
}
