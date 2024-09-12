import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/modules/base/entity.base';
import { StudentCourse } from '../student-course.entity';

@Entity('document_student')
export class DocumentStudent extends BaseEntity {
  @Column()
  name: string;

  @Column()
  key: string;

  @Column()
  exprires: Date;

  @ManyToOne(() => StudentCourse, (studentCourse) => studentCourse.documents)
  @JoinColumn({ name: 'student_course_id' })
  studentCourse: number;
}
