import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/modules/base/entity.base';
import { StudentCourse } from '../../studentCourse/student-course.entity';
import { Collaborator } from '../../collaborator/collaborator.entity';

@Entity('period_justification')
@Index(['studentCourse', 'startDate', 'endDate'])
export class PeriodJustification extends BaseEntity {
  @ManyToOne(() => StudentCourse, (sc) => sc.periodJustifications)
  @JoinColumn({ name: 'student_course_id' })
  public studentCourse: StudentCourse;

  @Column({ type: 'date', name: 'start_date' })
  public startDate: Date;

  @Column({ type: 'date', name: 'end_date' })
  public endDate: Date;

  @Column({ type: 'varchar', length: 255 })
  public justification: string;

  @ManyToOne(() => Collaborator)
  @JoinColumn({ name: 'created_by_id' })
  public createdBy: Collaborator;
}
