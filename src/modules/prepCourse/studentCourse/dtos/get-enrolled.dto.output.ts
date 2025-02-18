import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { StatusApplication } from '../enums/stastusApplication';
import { LogStudent } from '../log-student/log-student.entity';

export class GetEnrolledDtoOutput {
  name: string;
  students: GetAllOutput<StudentsDtoOutput>;
}

export class StudentsDtoOutput {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  urgencyPhone?: string;
  applicationStatus: StatusApplication;
  cod_enrolled: string;
  birthday: Date;
  class?: {
    id: string;
    name: string;
    year: string;
    endDate: Date;
  };
  photo: string;
  logs: LogStudent[];
}
