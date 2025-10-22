import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { Class } from '../class/class.entity';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';

@Entity('course_periods')
export class CoursePeriod extends BaseEntity {
  @Column()
  public name: string;

  @Column()
  public year: number;

  @Column()
  public startDate: Date;

  @Column()
  public endDate: Date;

  @ManyToOne(
    () => PartnerPrepCourse,
    (partnerPrepCourse) => partnerPrepCourse.coursePeriods,
  )
  @JoinColumn({ name: 'partner_prep_course_id' })
  partnerPrepCourse: PartnerPrepCourse;

  @OneToMany(() => Class, (classEntity) => classEntity.coursePeriod)
  classes: Class[];
}
