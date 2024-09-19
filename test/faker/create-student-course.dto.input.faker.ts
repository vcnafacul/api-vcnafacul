import { faker } from '@faker-js/faker';
import { CreateStudentCourseInput } from 'src/modules/prepCourse/studentCourse/dtos/create-student-course.dto.input';
import { v4 as uuidv4 } from 'uuid';

export function createStudentCourseDTOInputFaker(
  userId?: string | undefined,
  partnerPrepCourseId?: string | undefined,
  rg?: string,
): CreateStudentCourseInput {
  return {
    rg: rg || generateRandomRG(),
    uf: generateRandomUF(),
    cpf: generateRandomCPF(),
    userId: userId ?? uuidv4(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    urgencyPhone: faker.phone.number(),
    birthday: faker.date.birthdate(),
    state: faker.location.state(),
    city: faker.location.city(),
    neighborhood: faker.location.country(),
    street: faker.location.street(),
    number: Math.floor(Math.random() * 1000),
    PostalCode: faker.location.zipCode(),
    socialName: faker.person.firstName(),
    whatsapp: faker.phone.number(),
    legalGuardian: {
      fullName: faker.person.firstName(),
      cpf: generateRandomCPF(),
      rg: generateRandomRG(),
      phone: faker.phone.number(),
      uf: generateRandomUF(),
    },
    partnerPrepCourse: partnerPrepCourseId ?? uuidv4(),
  };
}

function generateRandomRG(): string {
  return '45.123.456-7';
}

function generateRandomCPF(): string {
  // Função auxiliar para calcular os dígitos verificadores
  function calculateVerifierDigit(cpfArray: number[]): number {
    let sum = 0;
    let factor = cpfArray.length + 1;

    for (let i = 0; i < cpfArray.length; i++) {
      sum += cpfArray[i] * factor--;
    }

    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }

  // Gerar os primeiros 9 dígitos do CPF aleatoriamente
  const cpfArray: number[] = [];
  for (let i = 0; i < 9; i++) {
    cpfArray.push(Math.floor(Math.random() * 10));
  }

  // Calcular o primeiro dígito verificador
  const firstVerifierDigit = calculateVerifierDigit(cpfArray);
  cpfArray.push(firstVerifierDigit);

  // Calcular o segundo dígito verificador
  const secondVerifierDigit = calculateVerifierDigit(cpfArray);
  cpfArray.push(secondVerifierDigit);

  // Formatando o CPF como string no formato xxx.xxx.xxx-xx
  const cpf = cpfArray.join('');
  return `${cpf.substring(0, 3)}.${cpf.substring(3, 6)}.${cpf.substring(
    6,
    9,
  )}-${cpf.substring(9, 11)}`;
}

function generateRandomUF(): string {
  const ufs = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO',
  ];

  const randomIndex = Math.floor(Math.random() * ufs.length);
  return ufs[randomIndex];
}
