import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { NodeEntity } from '../../../shared/modules/node/node.entity';
import { User } from '../../user/user.entity';
import { StudentAttendance } from '../attendance/studentAttendance/student-attendance.entity';
import { Class } from '../class/class.entity';
import { InscriptionCourse } from '../InscriptionCourse/inscription-course.entity';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';
import { DocumentStudent } from './documents/document-students.entity';
import { StatusApplication } from './enums/stastusApplication';
import { LegalGuardian } from './legal-guardian/legal-guardian.entity';
import { LogStudent } from './log-student/log-student.entity';

//Representa o Estudante do Cursinho
@Entity('student_course')
export class StudentCourse extends NodeEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ nullable: true })
  rg?: string;

  @Column({ nullable: true })
  uf?: string;

  @Column()
  cpf: string;

  @Column()
  email: string;

  // Em caso de menor de idade, esse telefone será os do responsável
  @Column({ nullable: true })
  urgencyPhone?: string;

  @Column({ nullable: true })
  whatsapp?: string;

  @Column({ nullable: true, type: 'text' })
  socioeconomic?: string;

  @Column({ nullable: true, type: 'text' })
  areaInterest?: string;

  @Column({ nullable: true, type: 'text' })
  selectedCourses?: string;

  @OneToMany(
    () => DocumentStudent,
    (documentStudent) => documentStudent.studentCourse,
  )
  public documents: DocumentStudent[];

  @ManyToOne(() => User, (user) => user.studentCourse, {
    eager: true,
  })
  @JoinColumn({ name: 'user_id' })
  public user: User;

  @ManyToOne(
    () => PartnerPrepCourse,
    (partnerInscription) => partnerInscription.students,
  )
  @JoinColumn({ name: 'partner_prep_course_id' })
  partnerPrepCourse: PartnerPrepCourse;

  @ManyToOne(
    () => InscriptionCourse,
    (inscriptionCourse) => inscriptionCourse.students,
  )
  public inscriptionCourse: InscriptionCourse;

  @OneToOne(() => LegalGuardian, (legalGuardian) => legalGuardian.studentCourse)
  public legalGuardian: LegalGuardian;

  @Column({ default: false })
  public selectEnrolled: boolean; // Se ele está sendo selecionado

  @Column({ nullable: true })
  public selectEnrolledAt?: Date;

  @Column({ nullable: true })
  public limitEnrolledAt?: Date;

  @Column({ default: false })
  public waitingList: boolean;

  @Column({ default: true })
  isFree: boolean; // isento

  @Column({ default: StatusApplication.UnderReview })
  public applicationStatus: StatusApplication;

  @Column({ nullable: true, unique: true })
  public cod_enrolled: string;

  @OneToMany(() => LogStudent, (logStudent) => logStudent.student)
  public logs: LogStudent[];

  @Column({ nullable: true })
  public photo: string;

  @ManyToOne(() => Class, (classes) => classes.students)
  public class?: Class;

  get list(): string {
    throw new Error('Method not implemented.');
  }

  @OneToMany(
    () => StudentAttendance,
    (studentAttendance) => studentAttendance.studentCourse,
  )
  public attendance: StudentAttendance[];
}
