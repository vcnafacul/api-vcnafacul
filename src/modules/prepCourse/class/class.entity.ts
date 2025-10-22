import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../shared/modules/base/entity.base';
import { AttendanceRecord } from '../attendance/attendanceRecord/attendance-record.entity';
import { Collaborator } from '../collaborator/collaborator.entity';
import { CoursePeriod } from '../coursePeriod/course-period.entity';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';
import { StudentCourse } from '../studentCourse/student-course.entity';

@Entity('classes')
export class Class extends BaseEntity {
  @Column()
  public name: string;

  @Column({ nullable: true })
  public description?: string;

  @ManyToOne(
    () => PartnerPrepCourse,
    (partnerInscription) => partnerInscription.students,
  )
  @JoinColumn({ name: 'partner_prep_course_id' })
  partnerPrepCourse: PartnerPrepCourse;

  @ManyToOne(() => CoursePeriod, (coursePeriod) => coursePeriod.classes, {
    nullable: true,
  })
  @JoinColumn({ name: 'course_period_id' })
  coursePeriod: CoursePeriod;

  @OneToMany(() => StudentCourse, (students) => students.class, {
    eager: true,
  })
  public students: StudentCourse[];

  @ManyToMany(() => Collaborator, (collaborator) => collaborator)
  @JoinTable({
    name: 'classes_collaborators',
    joinColumn: {
      name: 'class_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'collaborator_id',
      referencedColumnName: 'id',
    },
  })
  public admins: Collaborator[];

  @OneToMany(
    () => AttendanceRecord,
    (attendanceRecord) => attendanceRecord.class,
  )
  public attendanceRecords: AttendanceRecord[];
}
