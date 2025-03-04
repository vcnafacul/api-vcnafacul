import { Module } from '@nestjs/common';
import { AttendanceRecordRepository } from './attendance-record.repository';
import { AttendanceRecordService } from './attendance-record.service';

@Module({
  controllers: [],
  imports: [],
  providers: [AttendanceRecordRepository, AttendanceRecordService],
  exports: [AttendanceRecordRepository, AttendanceRecordService],
})
export class AttendanceRecordModule {}
