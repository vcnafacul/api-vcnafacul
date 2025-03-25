export class GetClassByIdAttendanceDtoOutput {
  id: string;
  name: string;
  year: number;
  students: StudentClassAttendance[];
}

export class StudentClassAttendance {
  id: string;
  name: string;
  cod_enrolled: string;
}
