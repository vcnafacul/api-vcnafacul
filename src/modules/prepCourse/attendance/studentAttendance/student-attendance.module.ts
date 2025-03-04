import { Module } from '@nestjs/common';
import { StudentAttendanceRepository } from './student-attendance.repository';

@Module({
  controllers: [],
  imports: [],
  providers: [StudentAttendanceRepository],
  exports: [StudentAttendanceRepository],
})
export class StudentAttendanceModule {}
