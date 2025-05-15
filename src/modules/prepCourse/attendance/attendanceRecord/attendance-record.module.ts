import { Module } from '@nestjs/common';
import { UserModule } from 'src/modules/user/user.module';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { ClassRepository } from '../../class/class.repository';
import { CollaboratorRepository } from '../../collaborator/collaborator.repository';
import { AttendanceRecordController } from './attendance-record.controller';
import { AttendanceRecordRepository } from './attendance-record.repository';
import { AttendanceRecordService } from './attendance-record.service';
import { EnvModule } from 'src/shared/modules/env/env.module';

@Module({
  controllers: [AttendanceRecordController],
  imports: [UserModule, EnvModule],
  providers: [
    AttendanceRecordRepository,
    AttendanceRecordService,
    ClassRepository,
    CollaboratorRepository,
    DiscordWebhook,
  ],
  exports: [AttendanceRecordRepository, AttendanceRecordService],
})
export class AttendanceRecordModule {}
