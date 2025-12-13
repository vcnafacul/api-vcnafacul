import { Module } from '@nestjs/common';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { RefreshTokenService } from 'src/modules/user/services/refresh-token.service';
import { UserService } from 'src/modules/user/user.service';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { ContentModule } from '../content/content.module';
import { FrenteRepository } from '../frente/frente.repository';
import { SubjectController } from './subject.controller';
import { SubjectRepository } from './subject.repository';
import { SubjectService } from './subject.service';

@Module({
  controllers: [SubjectController],
  imports: [ContentModule, EnvModule],
  providers: [
    SubjectService,
    SubjectRepository,
    FrenteRepository,
    UserService,
    DiscordWebhook,
    RefreshTokenService,
    StudentCourseRepository,
  ],
  exports: [SubjectService, SubjectRepository, UserService],
})
export class SubjectModule {}
