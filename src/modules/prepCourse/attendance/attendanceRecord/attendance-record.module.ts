import { Module } from '@nestjs/common';
import { ClassRepository } from '../../class/class.repository';
import { CollaboratorRepository } from '../../collaborator/collaborator.repository';
import { AttendanceRecordController } from './attendance-record.controller';
import { AttendanceRecordRepository } from './attendance-record.repository';
import { AttendanceRecordService } from './attendance-record.service';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  controllers: [AttendanceRecordController],
  imports: [UserModule],
  providers: [
    AttendanceRecordRepository,
    AttendanceRecordService,
    ClassRepository,
    CollaboratorRepository,
  ],
  exports: [AttendanceRecordRepository, AttendanceRecordService],
})
export class AttendanceRecordModule {}
