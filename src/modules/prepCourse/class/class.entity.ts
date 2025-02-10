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
import { Collaborator } from '../collaborator/collaborator.entity';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';
import { StudentCourse } from '../studentCourse/student-course.entity';

@Entity('classes')
export class Class extends BaseEntity {
  @Column()
  public name: string;

  @Column({ nullable: true })
  public description?: string;

  @Column()
  public year: number;

  @Column()
  public startDate: Date;

  @Column()
  public endDate: Date;

  @ManyToOne(
    () => PartnerPrepCourse,
    (partnerInscription) => partnerInscription.students,
  )
  @JoinColumn({ name: 'partner_prep_course_id' })
  partnerPrepCourse: PartnerPrepCourse;

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
}
