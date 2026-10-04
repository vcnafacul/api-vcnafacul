import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/modules/base/entity.base';
import { PeriodJustification } from '../periodJustification/period-justification.entity';
import { StudentAttendance } from '../studentAttendance/student-attendance.entity';

@Entity('absence_justification')
export class AbsenceJustification extends BaseEntity {
  @OneToOne(
    () => StudentAttendance,
    (studentAttendance) => studentAttendance.justification,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn()
  public studentAttendance: StudentAttendance;

  @Column()
  public justification: string;

  /**
   * A justificativa de período que criou esta cópia (tickets-documentacao,
   * card 06): excluir o período remove as cópias dele. `null` = individual —
   * lançada à mão, ou cópia cujo texto alguém alterou.
   */
  @ManyToOne(() => PeriodJustification, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'period_justification_id' })
  public periodJustification?: PeriodJustification | null;
}
