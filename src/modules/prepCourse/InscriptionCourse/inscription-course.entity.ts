import { Column, Entity, JoinColumn, ManyToMany, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';
import { StudentCourse } from '../studentCourse/student-course.entity';
import { Status } from '../../simulado/enum/status.enum';

//Representa o Período de Inscrição de um cursinho
@Entity('inscription_course')
export class InscriptionCourse extends BaseEntity {
  @Column()
  name: string;

  @Column({ default: '' })
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

  @ManyToMany(
    () => StudentCourse,
    (studentCourse) => studentCourse.inscriptionCourses,
  )
  students: StudentCourse[];
}
