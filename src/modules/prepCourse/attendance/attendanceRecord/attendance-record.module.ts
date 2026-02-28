import { Module } from '@nestjs/common';
import { UserModule } from 'src/modules/user/user.module';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { ClassModule } from '../../class/class.module';
import { CollaboratorModule } from '../../collaborator/collaborator.module';
import { AttendanceRecordController } from './attendance-record.controller';
import { AttendanceRecordRepository } from './attendance-record.repository';
import { AttendanceRecordService } from './attendance-record.service';

@Module({
  controllers: [AttendanceRecordController],
  imports: [UserModule, EnvModule, ClassModule, CollaboratorModule],
  providers: [
    AttendanceRecordRepository,
    AttendanceRecordService,
    DiscordWebhook,
  ],
  exports: [AttendanceRecordRepository, AttendanceRecordService],
})
export class AttendanceRecordModule {}
