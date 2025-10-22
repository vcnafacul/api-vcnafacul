export class ClassDtoOutput {
  id: string;
  name: string;
  description?: string;
  coursePeriod: {
    id: string;
    name: string;
    year: number;
    startDate: Date;
    endDate: Date;
  };
  number_students: number;
}
