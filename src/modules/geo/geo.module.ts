import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { HttpServiceAxios } from 'src/shared/services/axios/httpServiceAxios';
import { EmailService } from 'src/shared/services/email/email.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RoleModule } from '../role/role.module';
import { UserRoleRepository } from '../user-role/user-role.repository';
import { UserRoleService } from '../user-role/user-role.service';
import { UserModule } from '../user/user.module';
import { GeoController } from './geo.controller';
import { GeoRepository } from './geo.repository';
import { GeoService } from './geo.service';

@Module({
  controllers: [GeoController],
  imports: [UserModule, RoleModule, AuditLogModule, HttpModule],
  providers: [
    GeoService,
    GeoRepository,
    EmailService,
    UserRoleService,
    UserRoleRepository,
    AuditLogService,
    AuditLogRepository,
    HttpServiceAxios,
  ],
})
export class GeoModule {}
