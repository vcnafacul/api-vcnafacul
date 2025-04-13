import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { LinkedListEntity } from '../../../shared/modules/linked/linked-list.entity';
import { Status } from '../../simulado/enum/status.enum';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';
import { StudentCourse } from '../studentCourse/student-course.entity';

//Representa o Período de Inscrição de um cursinho
@Entity('inscription_course')
export class InscriptionCourse extends LinkedListEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'start_date' })
  startDate: Date;

  @Column({ name: 'end_date' })
  endDate: Date;

  @Column({ default: Status.Pending })
  actived: Status;

  // Representa o numero de vagas esperada para o periodo de inscrição
  @Column({ name: 'expected_opening' })
  expectedOpening: number;

  @ManyToOne(
    () => PartnerPrepCourse,
    (partnerInscription) => partnerInscription.inscriptionCourses,
  )
  @JoinColumn({ name: 'partner_prep_course_id' })
  partnerPrepCourse: PartnerPrepCourse;

  @OneToMany(
    () => StudentCourse,
    (studentCourse) => studentCourse.inscriptionCourse,
  )
  students: StudentCourse[];

  @Column({ default: false })
  requestDocuments: boolean;

  get list(): string {
    throw new Error('Method not implemented.');
  }
}
