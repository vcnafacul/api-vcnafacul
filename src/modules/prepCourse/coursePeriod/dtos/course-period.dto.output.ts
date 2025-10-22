export class CoursePeriodDtoOutput {
  id: string;
  name: string;
  year: number;
  startDate: Date;
  endDate: Date;
  partnerPrepCourseId: string;
  classesCount: number;
  createdAt: Date;
  updatedAt: Date;
  classes: {
    id: string;
    name: string;
    description?: string;
    number_students: number;
  }[];
}
