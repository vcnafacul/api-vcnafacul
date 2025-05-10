import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BaseService } from 'src/shared/modules/base/base.service';
import { AbsenceJustification } from '../absenceJustification/absence-justification.entity';
import { AbsenceJustificationRepository } from '../absenceJustification/absence-justification.repository';
import { UpdateAttendanceDtoInput } from './dtos/update-attendance.dto.input';
import { StudentAttendance } from './student-attendance.entity';
import { StudentAttendanceRepository } from './student-attendance.repository';

@Injectable()
export class StudentAttendanceService extends BaseService<StudentAttendance> {
  constructor(
    private readonly repository: StudentAttendanceRepository,
    private readonly absenceJustificationRepository: AbsenceJustificationRepository,
  ) {
    super(repository);
  }

  async updatePresent({
    id,
    present,
    justification,
  }: UpdateAttendanceDtoInput): Promise<void> {
    const studentAttendance = await this.repository.findOneBy({ id });
    if (!studentAttendance) {
      throw new HttpException(
        `Student attendance not found by id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    studentAttendance.present = present;
    if (justification) {
      let absenceJustification = null;
      if (studentAttendance.justification) {
        absenceJustification =
          await this.absenceJustificationRepository.findOneBy({
            id: studentAttendance.justification.id,
          });
      }
      if (!absenceJustification) {
        absenceJustification = new AbsenceJustification();
      }
      absenceJustification.justification = justification;
      absenceJustification.studentAttendance = studentAttendance;
      if (!studentAttendance.justification) {
        await this.absenceJustificationRepository.create(absenceJustification);
      } else {
        await this.absenceJustificationRepository.update(absenceJustification);
      }
      studentAttendance.justification = absenceJustification;
    }
    await this.repository.update(studentAttendance);
  }

  async updateJustificationsForAttendanceRecords(
    studentCourseId: string,
    attendanceRecordIds: string[],
    justification: string,
  ): Promise<void> {
    const studentAttendances =
      await this.repository.findAllByAttendanceRecordsWithJustification(
        studentCourseId,
        attendanceRecordIds,
      );

    for (const studentAttendance of studentAttendances) {
      let absenceJustification = studentAttendance.justification;

      if (!absenceJustification) {
        absenceJustification = new AbsenceJustification();
        absenceJustification.studentAttendance = studentAttendance;
      }

      absenceJustification.justification = justification;

      if (absenceJustification.id) {
        await this.absenceJustificationRepository.update(absenceJustification);
      } else {
        await this.absenceJustificationRepository.create(absenceJustification);
      }

      studentAttendance.justification = absenceJustification;
    }
  }
}
