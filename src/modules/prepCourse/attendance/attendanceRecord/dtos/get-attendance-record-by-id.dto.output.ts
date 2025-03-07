export class GetAttendanceRecordByIdDtoOutput {
  id: string;
  registeredAt: Date;
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
