import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/modules/base/entity.base';
import { User } from '../../../user/user.entity';
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
    { onDelete: 'CASCADE' },
  )
  public attendanceRecord: AttendanceRecord;

  @OneToOne(
    () => AbsenceJustification,
    (attendance) => attendance.studentAttendance,
    { onDelete: 'CASCADE' },
  )
  public justification?: AbsenceJustification;

  @Column({ type: 'tinyint', width: 1 })
  public present: boolean;

  /**
   * Por que a presença foi editada (tickets-documentacao, card 05). **Não** é
   * justificativa de falta e não entra no cálculo; cada edição substitui.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  public observation: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'observation_by' })
  public observationBy: User | null;

  @Column({ name: 'observation_at', type: 'datetime', nullable: true })
  public observationAt: Date | null;
}
