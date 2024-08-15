import { Module } from '@nestjs/common';
import { HttpServiceAxios } from 'src/shared/services/axios/httpServiceAxios';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogService } from './audit-log.service';
import { HttpModule } from '@nestjs/axios';
import { AuditLogController } from './audit-log.controller';

@Module({
  imports: [HttpModule],
  providers: [AuditLogService, AuditLogRepository, HttpServiceAxios],
  exports: [AuditLogService, AuditLogRepository],
  controllers: [AuditLogController],
})
export class AuditLogModule {}
