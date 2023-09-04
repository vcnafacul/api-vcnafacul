import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository';
import { CreateAuditDtoInput } from './dto/create-audit.dto.input';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async create(request: CreateAuditDtoInput): Promise<AuditLog> {
    const auditLog = new AuditLog();
    auditLog.entityType = request.entityType;
    auditLog.entityId = request.entityId;
    auditLog.changes = JSON.stringify(request.changes);
    auditLog.updatedBy = request.updatedBy;

    return await this.auditLogRepository.create(auditLog);
  }
}
