export class GetAllPrepCourseDtoOutput {
  id: string;
  geo: {
    id: string;
    name: string;
    category: string;
    city: string;
    state: string;
    phone: string;
  };
  representative: {
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
