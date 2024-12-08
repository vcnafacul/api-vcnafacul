import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager } from 'typeorm';
import { LogStudent } from './log-student.entity';

@Injectable()
export class LogStudentRepository extends BaseRepository<LogStudent> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(LogStudent));
  }
}
