import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { User } from '../../user/user.entity';
import { AttendanceRecord } from '../attendance/attendanceRecord/attendance-record.entity';
import { Class } from '../class/class.entity';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';

//Representa o Estudante do Cursinho
@Entity('collaborators')
export class Collaborator extends BaseEntity {
  @OneToOne(() => User, (user) => user.collaborator, {
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

  @Column({ nullable: true })
  public photo: string;

  @Column({ nullable: true })
  public description: string;

  @Column({ default: true })
  public actived: boolean;

  @ManyToMany(() => Class, (classes) => classes.admins)
  public Class: Class[];

  @OneToMany(
    () => AttendanceRecord,
    (attendanceRecord) => attendanceRecord.class,
  )
  public attendanceRecords: AttendanceRecord[];
}
