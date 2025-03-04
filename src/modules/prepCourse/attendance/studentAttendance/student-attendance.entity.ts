import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/modules/base/entity.base';
import { StudentCourse } from '../../studentCourse/student-course.entity';
import { AbsenceJustification } from '../absenceJustification/absence-justification.entity';
import { AttendanceRecord } from '../attendanceRecord/attendance-record.entity';

@Entity('student_attendance')
@Unique(['attendanceRecord', 'studentCourse'])
export class StudentAttendance extends BaseEntity {
  @ManyToOne(() => StudentCourse, (studentCourse) => studentCourse.attendance)
  public studentCourse: StudentCourse;

  @ManyToOne(
    () => AttendanceRecord,
    (attendance) => attendance.studentAttendance,
  )
  public attendanceRecord: AttendanceRecord;

  @OneToOne(
    () => AbsenceJustification,
    (attendance) => attendance.studentAttendance,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn()
  public justification?: AbsenceJustification;

  @Column({ type: 'tinyint', width: 1 })
  public present: boolean;
}
