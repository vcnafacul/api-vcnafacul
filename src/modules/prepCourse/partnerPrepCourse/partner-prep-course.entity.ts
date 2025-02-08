import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { Geolocation } from '../../geo/geo.entity';
import { Class } from '../class/class.entity';
import { Collaborator } from '../collaborator/collaborator.entity';
import { InscriptionCourse } from '../InscriptionCourse/inscription-course.entity';
import { StudentCourse } from '../studentCourse/student-course.entity';

//Cursinho Parceiro
@Entity('partner_prep_course')
export class PartnerPrepCourse extends BaseEntity {
  @Column({ name: 'geo_id' })
  geoId: string;

  @OneToOne(() => Geolocation)
  @JoinColumn({ name: 'geo_id' })
  public geo: Geolocation;

  @OneToMany(
    () => InscriptionCourse,
    (inscriptionCourse) => inscriptionCourse.partnerPrepCourse,
  )
  public inscriptionCourses: InscriptionCourse[];

  @OneToMany(
    () => StudentCourse,
    (studentCourse) => studentCourse.partnerPrepCourse,
  )
  public students: StudentCourse[];

  @OneToMany(
    () => Collaborator,
    (collaborator) => collaborator.partnerPrepCourse,
  )
  public members: Collaborator[];

  @OneToMany(() => Class, (c) => c.partnerPrepCourse)
  public classes: Class[];
}
