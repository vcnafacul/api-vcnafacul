export class GetClassByIdAttendanceDtoOutput {
  id: string;
  name: string;
  coursePeriodId: string;
  coursePeriodName: string;
  coursePeriodYear: number;
  students: StudentClassAttendance[];
}

export class StudentClassAttendance {
  id: string;
  name: string;
  cod_enrolled: string;
}
