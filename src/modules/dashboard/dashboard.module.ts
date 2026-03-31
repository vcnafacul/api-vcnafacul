import { Module } from '@nestjs/common';
import { CollaboratorModule } from '../prepCourse/collaborator/collaborator.module';
import { StudentAttendanceModule } from '../prepCourse/attendance/studentAttendance/student-attendance.module';
import { StudentCourseModule } from '../prepCourse/studentCourse/student-course.module';
import { SimuladoModule } from '../simulado/simulado.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { CollaboratorFrenteRepository } from '../prepCourse/collaborator/collaborator-frente.repository';

@Module({
  imports: [
    StudentCourseModule,
    StudentAttendanceModule,
    CollaboratorModule,
    SimuladoModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService, CollaboratorFrenteRepository],
})
export class DashboardModule {}
