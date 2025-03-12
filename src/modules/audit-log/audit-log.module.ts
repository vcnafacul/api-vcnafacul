import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { HttpServiceAxios } from 'src/shared/services/axios/httpServiceAxios';
import { AuditLogController } from './audit-log.controller';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [HttpModule],
  providers: [AuditLogService, AuditLogRepository, HttpServiceAxios],
  exports: [AuditLogService, AuditLogRepository],
  controllers: [AuditLogController],
})
export class AuditLogModule {}
