import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';
import { AuditLog } from './audit-log.entity';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogMS } from './dto/auditLogMS';
import { CreateAuditDtoInput } from './dto/create-audit.dto.input';

@Injectable()
export class AuditLogService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
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
    return await this.axios.get<AuditLogMS[]>(`v1/auditLog/${id}`);
  }
}
