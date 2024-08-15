import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';

@ApiTags('AuditLog')
@Controller('auditLog')
export class AuditLogController {
  constructor(private service: AuditLogService) {}

  @Get('ms/:id')
  async getMSByEntityId(@Param('id') id: string) {
    return await this.service.getMSByEntityId(id);
  }
}
