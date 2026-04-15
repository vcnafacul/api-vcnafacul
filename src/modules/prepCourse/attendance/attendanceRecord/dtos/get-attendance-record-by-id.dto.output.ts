import { AttendancePeriod } from '../enum/attendance-period.enum';

export class GetAttendanceRecordByIdDtoOutput {
  id: string;
  registeredAt: Date;
  period: AttendancePeriod;
  createdAt: Date;
  classId: string;
  studentAttendance: {
    id: string;
    present: boolean;
    justification?: string;
    student: {
      name: string;
      cod_enrolled: string;
    };
  }[];
  registeredBy: {
    name: string;
    email: string;
  };
}
