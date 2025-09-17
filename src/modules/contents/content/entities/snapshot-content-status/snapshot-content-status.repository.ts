import { Injectable } from "@nestjs/common";
import { BaseRepository } from "src/shared/modules/base/base.repository";
import { SnapshotContentStatus } from "./snapshot-content-status.entity";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";

@Injectable()
export class SnapshotContentStatusRepository extends BaseRepository<SnapshotContentStatus> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(SnapshotContentStatus));
  }
}