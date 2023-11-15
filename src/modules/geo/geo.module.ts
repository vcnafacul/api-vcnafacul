import { Module } from '@nestjs/common';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';
import { GeoRepository } from './geo.repository';
import { EmailService } from 'src/shared/services/email.service';
import { UserModule } from '../user/user.module';
import { RoleModule } from '../role/role.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UserRoleRepository } from '../user-role/user-role.repository';
import { UserRoleService } from '../user-role/user-role.service';

@Module({
  controllers: [GeoController],
  imports: [UserModule, RoleModule, AuditLogModule],
  providers: [
    GeoService,
    GeoRepository,
    EmailService,
    UserRoleService,
    UserRoleRepository,
    AuditLogService,
    AuditLogRepository,
  ],
})
export class GeoModule {}
