import { StatusApplication } from '../../studentCourse/enums/stastusApplication';
import { LogStudent } from '../../studentCourse/log-student/log-student.entity';

export class GetClassByIdDtoOutput {
  id: string;
  name: string;
  description?: string;
  partnerId: string;
  coursePeriodId: string;
  coursePeriodName: string;
  coursePeriodYear: number;
  coursePeriodStartDate: Date;
  coursePeriodEndDate: Date;
  number_students: number;
  totalAttendanceRecords: number;
  students: StudentClass[];
}

export class StudentClass {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: StatusApplication;
  cod_enrolled: string;
  photo: string;
  logs: LogStudent[];
  birthday: Date;
  // O servico monta o objeto com created_at/updated_at; o DTO declarava
  // camelCase e o cast `as unknown as GetClassByIdDtoOutput` escondia a
  // divergencia, o que induziu o front a ler os nomes errados.
  created_at: Date;
  updated_at: Date;
  socioeconomic: string;
  isFree: string;
  areaInterest: string;
  selectedCourses: string;
  presencePercentage?: number | null;
  absencePercentage?: number | null;
  justifiedAbsencePercentage?: number | null;
}
