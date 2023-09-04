import { Injectable } from '@nestjs/common';
import { AuditLog } from './audit-log.entity';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class AuditLogRepository extends BaseRepository<AuditLog> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(AuditLog));
  }

  async create(auditLog: AuditLog): Promise<AuditLog> {
    return await this.repository.save(auditLog);
  }
}
