import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { format } from 'date-fns/format';
import { BaseService } from 'src/shared/modules/base/base.service';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { DataSource } from 'typeorm';
import { ClassRepository } from '../../class/class.repository';
import { CollaboratorRepository } from '../../collaborator/collaborator.repository';
import { AbsenceJustification } from '../absenceJustification/absence-justification.entity';
import { PeriodJustification } from '../periodJustification/period-justification.entity';
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
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { ExportAttendanceRecordDtoInput } from './dtos/export-attendance-record.dto.input';

@Injectable()
export class AttendanceRecordService extends BaseService<AttendanceRecord> {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private readonly repository: AttendanceRecordRepository,
    private readonly classRepository: ClassRepository,
    private readonly collaboratorRepository: CollaboratorRepository,
    private readonly cache: CacheService,
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

        // Auto-apply period justifications for absent students
        const absentAttendances = studentAttendances.filter(
          (sa) => !sa.present,
        );
        if (absentAttendances.length > 0) {
          const pjRepo = manager.getRepository(PeriodJustification);
          const ajRepo = manager.getRepository(AbsenceJustification);

          const absentStudentCourseIds = absentAttendances.map((sa) =>
            typeof sa.studentCourse === 'string'
              ? sa.studentCourse
              : sa.studentCourse.id,
          );

          const recordDate = dto.date; // the date string from the DTO
          const activePJs = await pjRepo
            .createQueryBuilder('pj')
            .leftJoinAndSelect('pj.studentCourse', 'sc')
            .where('pj.student_course_id IN (:...ids)', {
              ids: absentStudentCourseIds,
            })
            .andWhere('pj.start_date <= :date', { date: recordDate })
            .andWhere('pj.end_date >= :date', { date: recordDate })
            .andWhere('pj.deleted_at IS NULL')
            .getMany();

          if (activePJs.length > 0) {
            const pjByStudentId = new Map<string, PeriodJustification>();
            for (const pj of activePJs) {
              const scId =
                pj.studentCourse?.id || (pj as any).student_course_id;
              pjByStudentId.set(scId, pj);
            }

            const justificationsToCreate: AbsenceJustification[] = [];
            for (const sa of absentAttendances) {
              const scId =
                typeof sa.studentCourse === 'string'
                  ? sa.studentCourse
                  : sa.studentCourse.id;
              const pj = pjByStudentId.get(scId);
              if (pj) {
                justificationsToCreate.push(
                  ajRepo.create({
                    studentAttendance: sa,
                    justification: pj.justification,
                  }),
                );
              }
            }

            if (justificationsToCreate.length > 0) {
              await ajRepo.save(justificationsToCreate);
            }
          }
        }
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
    await this.cache.del(`presence_by_class_id_${dto.classId}`);
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
            (studentAttendance.studentCourse.user.useSocialName
              ? studentAttendance.studentCourse.user.socialName
              : studentAttendance.studentCourse.user.firstName) +
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
    studentId,
  }: GetAttendanceRecordByStudent): Promise<GetAllOutput<AttendanceRecord>> {
    return await this.repository.findManyByStudentId(page, limit, studentId);
  }

  async delete(id: string): Promise<void> {
    const record = await this.repository.findOneBy({ id });
    await this.repository.delete(id);
    if (record?.class?.id) {
      await this.cache.del(`presence_by_class_id_${record.class.id}`);
    }
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
        year: classEntity.coursePeriod?.year || 0,
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
        year: classEntity.coursePeriod?.year || 0,
      },
      startDate,
      endDate,
      report,
    });
  }

  async exportToExcel(
    dto: ExportAttendanceRecordDtoInput,
    res: Response,
  ): Promise<void> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    const records = await this.repository.findAllInRange(
      dto.classId,
      dto.startDate,
      dto.endDate,
    );

    const classEntity =
      await this.classRepository.findOneByIdToAttendanceRecord(dto.classId);

    // Build unique student list from records (includes user data via joins)
    const studentMap = new Map<
      string,
      { id: string; codEnrolled: string; name: string; email: string }
    >();
    for (const record of records) {
      for (const sa of record.studentAttendance) {
        if (!studentMap.has(sa.studentCourse.id)) {
          const user = sa.studentCourse.user;
          const name =
            user.useSocialName && user.socialName
              ? user.socialName
              : `${user.firstName} ${user.lastName}`;
          studentMap.set(sa.studentCourse.id, {
            id: sa.studentCourse.id,
            codEnrolled: sa.studentCourse.cod_enrolled,
            name,
            email: user.email,
          });
        }
      }
    }

    const students = [...studentMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Frequência');

    const className = classEntity?.name || '';
    const year = classEntity?.coursePeriod?.year || '';
    sheet.addRow([`Turma: ${className} - ${year}`]);
    sheet.addRow([
      `Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}`,
    ]);
    sheet.addRow([
      `Limite máximo de faltas injustificadas: ${dto.maxAbsencePercent}%`,
    ]);
    sheet.addRow([]);

    const dates = records.map((r) => ({
      id: r.id,
      date: new Date(r.registeredAt),
      label: new Date(r.registeredAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
    }));

    const headerRow = [
      'Matrícula',
      'Nome Completo',
      'Email',
      '% Presença',
      '% Faltas',
      '% Faltas Justif.',
      'Excedeu Limite',
      ...dates.map((d) => d.label),
    ];
    const excelHeaderRow = sheet.addRow(headerRow);
    excelHeaderRow.font = { bold: true };

    const attendanceMap = new Map<
      string,
      Map<string, { present: boolean; justified: boolean }>
    >();
    for (const record of records) {
      const sMap = new Map<string, { present: boolean; justified: boolean }>();
      for (const sa of record.studentAttendance) {
        sMap.set(sa.studentCourse.id, {
          present: sa.present,
          justified: !!sa.justification,
        });
      }
      attendanceMap.set(record.id, sMap);
    }

    for (const student of students) {
      let totalRecords = 0;
      let presentCount = 0;
      let justifiedAbsences = 0;

      const dayCells = dates.map((d) => {
        const sMap = attendanceMap.get(d.id);
        const entry = sMap?.get(student.id);
        if (!entry) return '-';
        totalRecords++;
        if (entry.present) {
          presentCount++;
          return 'P';
        }
        if (entry.justified) {
          justifiedAbsences++;
          return 'FJ';
        }
        return 'F';
      });

      const unjustifiedAbsences =
        totalRecords - presentCount - justifiedAbsences;
      const presencePercent =
        totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
      const justifiedPercent =
        totalRecords > 0
          ? Math.round((justifiedAbsences / totalRecords) * 100)
          : 0;
      const absencePercent =
        totalRecords > 0 ? 100 - presencePercent - justifiedPercent : 0;
      const exceededLimit =
        absencePercent > dto.maxAbsencePercent ? 'Sim' : 'Não';

      sheet.addRow([
        student.codEnrolled,
        student.name,
        student.email,
        `${presencePercent}%`,
        `${absencePercent}%`,
        `${justifiedPercent}%`,
        exceededLimit,
        ...dayCells,
      ]);
    }

    sheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const len = cell.value ? cell.value.toString().length : 0;
        if (len > maxLength) maxLength = len;
      });
      column.width = Math.min(maxLength + 2, 40);
    });

    const fileName = `frequencia-${className}-${dto.startDate}-${dto.endDate}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }
}
