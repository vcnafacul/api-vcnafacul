import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager } from 'typeorm';
import { LegalGuardian } from './legal-guardian.entity';

@Injectable()
export class LegalGuardianRepository extends BaseRepository<LegalGuardian> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(LegalGuardian));
  }
}
