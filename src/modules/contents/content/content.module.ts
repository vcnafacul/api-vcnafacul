import { Module } from '@nestjs/common';
import { AuditLogModule } from 'src/modules/audit-log/audit-log.module';
import { CollaboratorRepository } from 'src/modules/prepCourse/collaborator/collaborator.repository';
import { RoleRepository } from 'src/modules/role/role.repository';
import { UserModule } from 'src/modules/user/user.module';
import { UserRepository } from 'src/modules/user/user.repository';
import { UserService } from 'src/modules/user/user.service';
import { EmailService } from 'src/shared/services/email/email.service';
import { SubjectRepository } from '../subject/subject.repository';
import { ContentController } from './content.controller';
import { ContentRepository } from './content.repository';
import { ContentService } from './content.service';

@Module({
  controllers: [ContentController],
  imports: [AuditLogModule, UserModule],
  providers: [
    ContentService,
    ContentRepository,
    SubjectRepository,
    UserService,
    UserRepository,
    RoleRepository,
    EmailService,
    CollaboratorRepository,
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
