export interface SocioeconomicAnswer {
  question: string;
  answer: string | string[] | number | number[] | boolean;
}

export interface StudentCourseFull {
  createdAt: Date;
  email: string;
  cpf: string;
  rg: string;
  uf: string;
  urgencyPhone: string;
  socioeconomic: SocioeconomicAnswer[];
  whatsapp: string;
  firstName: string;
  lastName: string;
  socialName: string;
  birthday: string;
  gender: string;
  phone: string;
  neighborhood: string;
  street: string;
  number: string;
  complement: string;
  postalCode: string;
  city: string;
  state: string;
}
