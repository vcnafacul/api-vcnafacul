import { StatusApplication } from '../enums/stastusApplication';
import { LogStudent } from '../log-student/log-student.entity';

export class RegistrationMonitoringDtoOutput {
  id: string;
  partnerCourseName: string;
  inscriptionName: string;
  status: StatusApplication;
  logs: LogStudent[];
  createdAt: Date;
}
