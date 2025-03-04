import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BaseService } from 'src/shared/modules/base/base.service';
import { DataSource } from 'typeorm';
import { ClassRepository } from '../../class/class.repository';
import { CollaboratorRepository } from '../../collaborator/collaborator.repository';
import { StudentAttendance } from '../studentAttendance/student-attendance.entity';
import { AttendanceRecord } from './attendance-record.entity';
import { AttendanceRecordRepository } from './attendance-record.repository';
import { CreateAttendanceRecordDtoInput } from './dtos/create-attendance-record.dto.input';

@Injectable()
export class AttendanceRecordService extends BaseService<AttendanceRecord> {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private readonly repository: AttendanceRecordRepository,
    private readonly classRepository: ClassRepository,
    private readonly collaboratorRepository: CollaboratorRepository,
  ) {
    super(repository);
  }

  async create(dto: CreateAttendanceRecordDtoInput, userId: string) {
    const classEntity = await this.classRepository.findOneById(dto.classId);
    if (!classEntity) {
      throw new HttpException(
        `Class not found by id ${dto.classId}`,
        HttpStatus.NOT_FOUND,
      );
    }
    const collaborator =
      await this.collaboratorRepository.findOneByUserId(userId);
    if (!collaborator) {
      throw new HttpException(
        `Collaborator not found by id ${userId}`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (classEntity.students.length !== dto.studentIds.length) {
      throw new HttpException(
        'The number of students does not match',
        HttpStatus.BAD_REQUEST,
      );
    }
    const attendanceRecord = new AttendanceRecord();
    attendanceRecord.class = classEntity;
    attendanceRecord.registeredAt = dto.date;
    attendanceRecord.registeredBy = collaborator;

    try {
      await this.dataSource.transaction(async (manager) => {
        const record = await manager
          .getRepository(AttendanceRecord)
          .save(attendanceRecord);

        const studentAttendances: StudentAttendance[] =
          classEntity.students.map((student) => {
            const studentAttendance = new StudentAttendance();
            studentAttendance.attendanceRecord = record;
            studentAttendance.studentCourse = student;
            studentAttendance.present = dto.studentIds.includes(student.id);
            return studentAttendance;
          });
        await manager.getRepository(StudentAttendance).save(studentAttendances);

        return record;
      });
    } catch (error) {
      console.error('Error creating attendance record:', error);
      throw new HttpException(
        'An error occurred while creating the attendance record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
