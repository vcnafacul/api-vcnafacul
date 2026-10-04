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
    /** Por que a presença foi editada (card 05); `null` se nunca foi. */
    observation: { text: string; by: string | null; at: Date } | null;
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
