import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/modules/base/entity.base';
import { StudentCourse } from '../student-course.entity';

@Entity('legal_guardian')
export class LegalGuardian extends BaseEntity {
  @Column()
  fullName: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  rg?: string;

  @Column({ nullable: true })
  uf?: string;

  @Column()
  cpf: string;

  @Column()
  family_relationship: string;

  @OneToOne(() => StudentCourse, (studentCourse) => studentCourse.legalGuardian)
  @JoinColumn({ name: 'student_course_id' })
  studentCourse: StudentCourse;
}
