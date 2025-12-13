import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { Geolocation } from '../../geo/geo.entity';
import { Role } from '../../role/role.entity';
import { User } from '../../user/user.entity';
import { Class } from '../class/class.entity';
import { Collaborator } from '../collaborator/collaborator.entity';
import { CoursePeriod } from '../coursePeriod/course-period.entity';
import { InscriptionCourse } from '../InscriptionCourse/inscription-course.entity';
import { StudentCourse } from '../studentCourse/student-course.entity';
import { LogPartner } from './log-partner/log-partner.entity';

//Cursinho Parceiro
@Entity('partner_prep_course')
export class PartnerPrepCourse extends BaseEntity {
  @Column({ name: 'geo_id' })
  geoId: string;

  @OneToOne(() => Geolocation)
  @JoinColumn({ name: 'geo_id' })
  public geo: Geolocation;

  @OneToOne(() => User)
  @JoinColumn({ name: 'representative' })
  representative: User;

  @Column({ nullable: true })
  partnershipAgreement: string;

  @Column({ nullable: true })
  logo?: string;

  @Column({ nullable: true, type: 'blob' })
  thumbnail?: Buffer;

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

  @OneToMany(
    () => CoursePeriod,
    (coursePeriod) => coursePeriod.partnerPrepCourse,
  )
  public coursePeriods: CoursePeriod[];

  @OneToMany(() => Role, (role) => role.partnerPrepCourse)
  public roles: Role[];

  @OneToMany(() => LogPartner, (logPartner) => logPartner.partner)
  public logs: LogPartner[];
}
