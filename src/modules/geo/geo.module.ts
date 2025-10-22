import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { HttpServiceAxiosFactory } from 'src/shared/services/axios/http-service-axios.factory';
import { EmailService } from 'src/shared/services/email/email.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuditLogRepository } from '../audit-log/audit-log.repository';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RoleModule } from '../role/role.module';
import { UserModule } from '../user/user.module';
import { GeoController } from './geo.controller';
import { GeoRepository } from './geo.repository';
import { GeoService } from './geo.service';
import { LogGeoRepository } from './log-geo/log-geo.repository';
import { GeoExistValidator } from './validator/geo-exist.validator';

@Module({
  controllers: [GeoController],
  imports: [UserModule, RoleModule, AuditLogModule, HttpModule, EnvModule],
  providers: [
    GeoService,
    GeoRepository,
    EmailService,
    AuditLogService,
    AuditLogRepository,
    GeoExistValidator,
    LogGeoRepository,
    HttpServiceAxiosFactory,
  ],
})
export class GeoModule {}
