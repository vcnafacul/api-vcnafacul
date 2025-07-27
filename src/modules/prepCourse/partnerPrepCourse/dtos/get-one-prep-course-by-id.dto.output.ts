export class GetOnePrepCourseByIdDtoOutput {
  id: string;
  geo: Geolocation;
  representative: {
    name: string;
    email: string;
    phone: string;
  };
  partnershipAgreement: string;
  logo?: string;
  numberMembers: number;
  numberStudents: number;
  createdAt: Date;
  updatedAt: Date;
}
