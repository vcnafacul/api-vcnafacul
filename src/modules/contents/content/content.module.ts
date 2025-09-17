import { Module } from '@nestjs/common';
import { AuditLogModule } from 'src/modules/audit-log/audit-log.module';
import { CollaboratorRepository } from 'src/modules/prepCourse/collaborator/collaborator.repository';
import { RoleRepository } from 'src/modules/role/role.repository';
import { UserModule } from 'src/modules/user/user.module';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { BlobModule } from 'src/shared/services/blob/blob.module';
import { EmailService } from 'src/shared/services/email/email.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { FileContentRepository } from '../file-content/file-content.repository';
import { SubjectRepository } from '../subject/subject.repository';
import { ContentController } from './content.controller';
import { ContentRepository } from './content.repository';
import { ContentService } from './content.service';
import { SnapshotContentStatusRepository } from './entities/snapshot-content-status/snapshot-content-status.repository';

@Module({
  controllers: [ContentController],
  imports: [AuditLogModule, UserModule, BlobModule, EnvModule],
  providers: [
    ContentService,
    ContentRepository,
    SubjectRepository,
    UserService,
    UserRepository,
    RoleRepository,
    EmailService,
    CollaboratorRepository,
    DiscordWebhook,
    FileContentRepository,
    SnapshotContentStatusRepository,
  ],
  exports: [
    ContentService,
    ContentRepository,
    UserService,
    UserRepository,
    RoleRepository,
    EmailService,
    CollaboratorRepository,
  ],
})
export class ContentModule {}
