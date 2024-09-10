import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { User } from '../../user/user.entity';
import { InscriptionCourse } from '../InscriptionCourse/inscription-course.entity';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';

//Representa o Estudante do Cursinho
@Entity('student_course')
export class StudentCourse extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: number;

  @Column()
  rg: string;

  @Column()
  uf: string;

  @Column()
  cpf: string;

  // Em caso de menor de idade, esse telefone será os do responsável
  @Column({ nullable: true })
  urgencyPhone?: string;

  @OneToMany(() => User, (user) => user.studentCourse)
  @JoinColumn({ name: 'user_id' })
  public user: User;

  @ManyToOne(
    () => PartnerPrepCourse,
    (partnerInscription) => partnerInscription.students,
  )
  @JoinColumn({ name: 'partner_prep_course_id' })
  partnerPrepCourse: PartnerPrepCourse;

  @ManyToMany(
    () => InscriptionCourse,
    (inscriptionCourse) => inscriptionCourse.students,
  )
  public inscriptionCourses: InscriptionCourse[];
}
