import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager } from 'typeorm';
import { SnapshotContentStatus } from './snapshot-content-status.entity';

@Injectable()
export class SnapshotContentStatusRepository extends BaseRepository<SnapshotContentStatus> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(SnapshotContentStatus));
  }
}
