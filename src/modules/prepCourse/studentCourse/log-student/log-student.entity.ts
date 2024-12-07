import { Column, Entity, OneToMany } from 'typeorm';
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

  @OneToMany(() => StudentCourse, (student) => student.logs)
  student: StudentCourse;
}
