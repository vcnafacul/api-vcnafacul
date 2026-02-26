import { Module } from '@nestjs/common';
import { UserModule } from 'src/modules/user/user.module';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { AbsenceJustificationModule } from '../absenceJustification/absence-justification.module';
import { StudentAttendanceController } from './student-attendance.controller';
import { StudentAttendanceRepository } from './student-attendance.repository';
import { StudentAttendanceService } from './student-attendance.service';

@Module({
  controllers: [StudentAttendanceController],
  imports: [UserModule, EnvModule, AbsenceJustificationModule],
  providers: [StudentAttendanceRepository, StudentAttendanceService],
  exports: [StudentAttendanceRepository, StudentAttendanceService],
})
export class StudentAttendanceModule {}
