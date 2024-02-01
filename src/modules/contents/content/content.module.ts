import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ContentRepository } from './content.repository';
import { SubjectRepository } from '../subject/subject.repository';
import { AuditLogModule } from 'src/modules/audit-log/audit-log.module';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { UserRoleModule } from 'src/modules/user-role/user-role.module';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  controllers: [ContentController],
  imports: [AuditLogModule, UserRoleModule, UserModule],
  providers: [
    ContentService,
    ContentRepository,
    SubjectRepository,
    PermissionsGuard,
  ],
})
export class ContentModule {}
