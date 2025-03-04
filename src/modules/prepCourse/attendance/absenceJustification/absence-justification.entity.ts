import { Column, Entity, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/modules/base/entity.base';
import { StudentAttendance } from '../studentAttendance/student-attendance.entity';

@Entity('absence_justification')
export class AbsenceJustification extends BaseEntity {
  @OneToOne(
    () => StudentAttendance,
    (studentAttendance) => studentAttendance.justification,
  )
  public studentAttendance: StudentAttendance;

  @Column()
  public justification: string;
}
