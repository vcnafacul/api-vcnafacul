import { StatusApplication } from '../../studentCourse/enums/stastusApplication';
import { LogStudent } from '../../studentCourse/log-student/log-student.entity';

export class GetClassByIdDtoOutput {
  id: string;
  name: string;
  description?: string;
  year: number;
  startDate: Date;
  endDate: Date;
  number_students: number;
  students: StudentClass[];
}

export class StudentClass {
  id: string;
  name: string;
  email: string;
  status: StatusApplication;
  cod_enrolled: string;
  photo: string;
  logs: LogStudent[];
  birthday: Date;
  createdAt: Date;
  updatedAt: Date;
  socioeconomic: string;
  isFree: string;
  areaInterest: string;
  selectedCourses: string;
}
