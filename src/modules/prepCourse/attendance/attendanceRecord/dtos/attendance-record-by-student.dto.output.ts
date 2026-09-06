export class AttendanceRecordByStudentDtoOutput {
  class: {
    name: string;
    year: string;
  };
  startDate: Date;
  endDate: Date;
  report: {
    name: string;
    socialName: string;
    useSocialName: boolean;
    codEnrolled: string;
    whatsapp?: string;
    urgencyPhone?: string;
    totalClassRecords: number;
    studentRecords: number;
    presencePercentage: number;
  }[];
}
