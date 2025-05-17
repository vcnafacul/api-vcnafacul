import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import { HttpServiceAxios } from 'src/shared/services/axios/httpServiceAxios';
import { AuditLog } from './audit-log.entity';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogMS } from './dto/auditLogMS';
import { CreateAuditDtoInput } from './dto/create-audit.dto.input';

@Injectable()
export class AuditLogService {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly axios: HttpServiceAxios,
    private readonly envService: EnvService,
  ) {
    this.axios.setBaseURL(this.envService.get('SIMULADO_URL'));
  }

  async create(request: CreateAuditDtoInput): Promise<AuditLog> {
    const auditLog = new AuditLog();
    auditLog.entityType = request.entityType;
    auditLog.entityId = request.entityId;
    auditLog.changes = JSON.stringify(request.changes);
    auditLog.updatedBy = request.updatedBy;

    return await this.auditLogRepository.create(auditLog);
  }

  async getMSByEntityId(id: string): Promise<AuditLogMS[]> {
    return (
      await this.axios.get<AuditLogMS[]>(`v1/auditLog/${id}`)
    ).toPromise();
  }
}
