import { Module } from '@nestjs/common';
import { SimuladoController } from './simulado.controller';
import { SimuladoService } from './simulado.service';
import { HttpModule } from '@nestjs/axios';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditLogRepository } from '../audit-log/audit-log.repository';

@Module({
  imports: [HttpModule],
  controllers: [SimuladoController],
  providers: [SimuladoService, AuditLogService, AuditLogRepository],
})
export class SimuladoModule {}
