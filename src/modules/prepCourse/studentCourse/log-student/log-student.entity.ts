import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/modules/base/entity.base';
import { StatusApplication } from '../enums/stastusApplication';
import { StudentCourse } from '../student-course.entity';

@Entity('log_student')
export class LogStudent extends BaseEntity {
  @Column({ name: 'student_id' })
  studentId: string;

  @Column()
  public applicationStatus: StatusApplication;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ length: 100, nullable: true })
  browser: string | null;

  @Column({ length: 100, nullable: true })
  os: string | null;

  @Column({ length: 50, nullable: true })
  device: string | null;

  @Column({ length: 45, nullable: true })
  ip: string | null;

  @ManyToOne(() => StudentCourse, (studentCourse) => studentCourse.logs, {
    eager: false,
  })
  @JoinColumn({ name: 'student_id' }) // Ensures the join column is correctly mapped
  student: StudentCourse;
}
