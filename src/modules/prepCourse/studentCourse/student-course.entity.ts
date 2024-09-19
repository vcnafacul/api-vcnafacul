import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { User } from '../../user/user.entity';
import { InscriptionCourse } from '../InscriptionCourse/inscription-course.entity';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';
import { DocumentStudent } from './documents/document-students.entity';
import { LegalGuardian } from './legal-guardian/legal-guardian.entity';

//Representa o Estudante do Cursinho
@Entity('student_course')
export class StudentCourse extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  rg: string;

  @Column()
  uf: string;

  @Column()
  cpf: string;

  @Column()
  email: string;

  // Em caso de menor de idade, esse telefone será os do responsável
  @Column({ nullable: true })
  urgencyPhone?: string;

  @Column({ nullable: true })
  whatsapp?: string;

  @OneToMany(
    () => DocumentStudent,
    (documentStudent) => documentStudent.studentCourse,
  )
  public documents: DocumentStudent[];

  @ManyToOne(() => User, (user) => user.studentCourse)
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
  @JoinTable()
  public inscriptionCourses: InscriptionCourse[];

  @OneToOne(() => LegalGuardian, (legalGuardian) => legalGuardian.studentCourse)
  @JoinColumn({ name: 'legal_guardian_id' })
  public legalGuardian: LegalGuardian;
}
