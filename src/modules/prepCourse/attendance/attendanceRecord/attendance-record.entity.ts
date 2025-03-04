import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../../shared/modules/base/entity.base';
import { Class } from '../../class/class.entity';
import { Collaborator } from '../../collaborator/collaborator.entity';
import { StudentAttendance } from '../studentAttendance/student-attendance.entity';

@Entity('attendance_record')
export class AttendanceRecord extends BaseEntity {
  @ManyToOne(() => Class, (classRoom) => classRoom.attendanceRecords)
  public class: Class;

  @ManyToOne(
    () => Collaborator,
    (collaborator) => collaborator.attendanceRecords,
  )
  public registeredBy: Collaborator;

  @OneToMany(
    () => StudentAttendance,
    (studentAttendance) => studentAttendance.attendanceRecord,
    { onDelete: 'CASCADE' },
  )
  public studentAttendance: StudentAttendance[];

  @Column({ type: 'datetime' })
  public registeredAt: Date;
}
