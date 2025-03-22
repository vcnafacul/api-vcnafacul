import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager } from 'typeorm';
import { AbsenceJustification } from './absence-justification.entity';

@Injectable()
export class AbsenceJustificationRepository extends BaseRepository<AbsenceJustification> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(AbsenceJustification));
  }
}
