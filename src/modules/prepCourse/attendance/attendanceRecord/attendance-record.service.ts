import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { format } from 'date-fns/format';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { DataSource } from 'typeorm';
import { ClassRepository } from '../../class/class.repository';
import { CollaboratorRepository } from '../../collaborator/collaborator.repository';
import { StudentAttendance } from '../studentAttendance/student-attendance.entity';
import { AttendanceRecord } from './attendance-record.entity';
import { AttendanceRecordRepository } from './attendance-record.repository';
import { AttendanceRecordByClassInput } from './dtos/attendance-record-by-class.dto.input';
import {
  AttendanceRecordByClassOutput,
  AttendanceRecordItem,
} from './dtos/attendance-record-by-class.dto.output';
import { AttendanceRecordByStudentDtoOutput } from './dtos/attendance-record-by-student.dto.output';
import { CreateAttendanceRecordDtoInput } from './dtos/create-attendance-record.dto.input';
import { GetAttendanceRecordByIdDtoOutput } from './dtos/get-attendance-record-by-id.dto.output';
import { GetAttendanceRecordByStudent } from './dtos/get-attendance-record-by-student';
import { GetAttendanceRecord } from './dtos/get-attendance-record.dto.input';

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
    const classEntity =
      await this.classRepository.findOneByIdToAttendanceRecord(dto.classId);
    if (!classEntity) {
      throw new HttpException(
        `Class not found by id ${dto.classId}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const isAttendanceRecordToday =
      (await this.repository.findByClassIdAndDate(classEntity.id, dto.date)) !==
      null;
    if (isAttendanceRecordToday) {
      throw new HttpException(
        'Já existe um registro de presença para a data informada',
        HttpStatus.BAD_REQUEST,
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
    const attendanceRecord = new AttendanceRecord();
    attendanceRecord.class = classEntity;
    attendanceRecord.registeredAt = dto.date;
    attendanceRecord.registeredBy = collaborator;

    let record: AttendanceRecord = null;
    try {
      await this.dataSource.transaction(async (manager) => {
        record = await manager
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
      });
    } catch (error) {
      console.error('Error creating attendance record:', error);
      throw new HttpException(
        'An error occurred while creating the attendance record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (!record) {
      throw new HttpException(
        'An error occurred while creating the attendance record',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return record;
  }

  async findOneById(id: string): Promise<GetAttendanceRecordByIdDtoOutput> {
    const record = await this.repository.findOneBy({ id });
    if (!record) {
      throw new HttpException(
        `Attendance record not found by id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      id: record.id,
      classId: record.class.id,
      registeredAt: record.registeredAt,
      studentAttendance: record.studentAttendance.map((studentAttendance) => ({
        id: studentAttendance.id,
        present: studentAttendance.present,
        justification: studentAttendance.justification?.justification,
        student: {
          name:
            studentAttendance.studentCourse.user.firstName +
            ' ' +
            studentAttendance.studentCourse.user.lastName,
          cod_enrolled: studentAttendance.studentCourse.cod_enrolled,
        },
      })),
      registeredBy: {
        name:
          record.registeredBy.user.firstName +
          ' ' +
          record.registeredBy.user.lastName,
        email: record.registeredBy.user.email,
      },
      createdAt: record.createdAt,
    };
  }

  async findAll({
    page,
    limit,
    classId,
  }: GetAttendanceRecord): Promise<GetAllOutput<AttendanceRecord>> {
    if (!classId) {
      throw new HttpException(
        `Class not found by id ${classId}`,
        HttpStatus.NOT_FOUND,
      );
    }
    const cl = await this.classRepository.findOneBy({ id: classId });
    if (!cl) {
      throw new HttpException(
        `Class not found by id ${classId}`,
        HttpStatus.NOT_FOUND,
      );
    }
    const where = { class: cl };

    const data = await this.repository.findAllBy({
      page,
      limit,
      where,
    });
    return data;
  }

  async findManyByStudentId({
    page,
    limit,
    id,
    studentId,
  }: GetAttendanceRecordByStudent): Promise<GetAllOutput<AttendanceRecord>> {
    return await this.repository.findManyByStudentId(
      page,
      limit,
      id,
      studentId,
    );
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  groupByDate(records: AttendanceRecordItem[]): AttendanceRecordItem[] {
    const grouped = new Map<string, { total: number; presentCount: number }>();

    for (const record of records) {
      const dateKey = format(new Date(record.date), 'yyyy-MM-dd');

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, { total: 0, presentCount: 0 });
      }

      const agg = grouped.get(dateKey)!;
      agg.total += Number(record.total);
      agg.presentCount += Number(record.presentCount);
    }

    return Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      total: data.total,
      presentCount: data.presentCount,
    }));
  }

  async getAttendanceRecordByClassId({
    classId,
    startDate,
    endDate,
  }: AttendanceRecordByClassInput): Promise<AttendanceRecordByClassOutput> {
    const classEntity =
      await this.classRepository.findOneByIdWithPartner(classId);
    if (!classEntity) {
      throw new HttpException(
        `Class not found by id ${classId}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const endDateCopy = new Date(endDate);
    endDateCopy.setDate(endDateCopy.getDate() + 1);

    const classReport = await this.repository.dailyAttendanceByClassId(
      classId,
      startDate,
      endDateCopy,
    );

    const generalReport = await this.repository.dailyAttendanceForClassIds(
      [],
      classEntity.partnerPrepCourse.id,
      startDate,
      endDateCopy,
    );

    return {
      class: {
        name: classEntity.name,
        year: classEntity.year,
      },
      startDate,
      endDate,
      classReport: classReport
        .map((item) => ({
          ...item,
          date: format(new Date(item.date), 'yyyy-MM-dd'),
          total: Number(item.total),
          presentCount: Number(item.presentCount),
        }))
        .sort((a, b) => b.date.localeCompare(a.date)),

      generalReport: this.groupByDate(generalReport).sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    };
  }

  async getStudentPresenceReportByClassId({
    classId,
    startDate,
    endDate,
  }: AttendanceRecordByClassInput): Promise<any> {
    const classEntity =
      await this.classRepository.findOneByIdWithPartner(classId);
    if (!classEntity) {
      throw new HttpException(
        `Class not found by id ${classId}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const report = await this.repository.studentAttendanceReportByClassId(
      classId,
      startDate,
      endDate,
    );

    return Object.assign(new AttendanceRecordByStudentDtoOutput(), {
      class: {
        name: classEntity.name,
        year: classEntity.year,
      },
      startDate,
      endDate,
      report,
    });
  }
}
