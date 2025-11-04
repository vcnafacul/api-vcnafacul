export enum EnrollmentPeriodStatus {
  NOT_STARTED = 'NOT_STARTED', // Período ainda não começou
  IN_PROGRESS = 'IN_PROGRESS', // Período em andamento
  FINISHED = 'FINISHED', // Período finalizado
}

export class VerifyEnrollmentStatusDtoOutput {
  isEnrolled: boolean;
  message: string;
  periodStatus?: EnrollmentPeriodStatus;
  courseInfo?: {
    name: string;
    startDate: Date;
    endDate: Date;
  };
}
