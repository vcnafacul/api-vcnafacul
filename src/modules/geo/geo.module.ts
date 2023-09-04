import { Module } from '@nestjs/common';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';
import { GeoRepository } from './geo.repository';
import { EmailService } from 'src/shared/services/email.service';
import { UserModule } from '../user/user.module';
import { RoleModule } from '../role/role.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  controllers: [GeoController],
  imports: [UserModule, RoleModule, AuditLogModule],
  providers: [GeoService, GeoRepository, EmailService],
})
export class GeoModule {}
