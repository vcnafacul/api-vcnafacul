export class AttendanceRecordByStudentDtoOutput {
  class: {
    name: string;
    year: string;
  };
  startDate: Date;
  endDate: Date;
  report: {
    studentName: string;
    codEnrolled: string;
    totalClassRecords: number;
    studentRecords: number;
    presencePercentage: number;
  }[];
}
