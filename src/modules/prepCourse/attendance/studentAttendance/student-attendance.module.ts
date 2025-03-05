import { Module } from '@nestjs/common';
import { AbsenceJustificationRepository } from '../absenceJustification/absence-justification.repository';
import { StudentAttendanceController } from './student-attendance.controller';
import { StudentAttendanceRepository } from './student-attendance.repository';
import { StudentAttendanceService } from './student-attendance.service';

@Module({
  controllers: [StudentAttendanceController],
  imports: [],
  providers: [
    StudentAttendanceRepository,
    StudentAttendanceService,
    AbsenceJustificationRepository,
  ],
  exports: [StudentAttendanceRepository, StudentAttendanceService],
})
export class StudentAttendanceModule {}
