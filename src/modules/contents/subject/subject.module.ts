import { Module } from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { ContentModule } from '../content/content.module';
import { FrenteRepository } from '../frente/frente.repository';
import { SubjectController } from './subject.controller';
import { SubjectRepository } from './subject.repository';
import { SubjectService } from './subject.service';

@Module({
  controllers: [SubjectController],
  imports: [ContentModule],
  providers: [
    SubjectService,
    SubjectRepository,
    FrenteRepository,
    UserService,
    DiscordWebhook,
  ],
  exports: [SubjectService, SubjectRepository, UserService],
})
export class SubjectModule {}
