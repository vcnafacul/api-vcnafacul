export interface EnrollmentCertificate {
  logo: string;
  logoVcNaFacul: string;
  geo: {
    name: string;
    email: string;
    cep: string;
    state: string;
    city: string;
    neighborhood: string;
    street: string;
    number: string;
    complement: string;
  };
  student: {
    name: string;
    cpf: string;
  };
  enrollmentCode: string;
  coursePeriod: {
    startDate: Date;
    endDate: Date;
  };
}
