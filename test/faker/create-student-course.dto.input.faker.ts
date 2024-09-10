import { CreateStudentCourseInput } from 'src/modules/prepCourse/studentCourse/dtos/create-student-course.dto.input';

export function createStudentCourseDTOInputFaker(
  userId?: number | undefined,
  partnerPrepCourseId?: number | undefined,
): CreateStudentCourseInput {
  return {
    rg: generateRandomRG(),
    uf: generateRandomUF(),
    cpf: generateRandomCPF(),
    userId: userId ?? Math.floor(9999 + Math.random() * 9999),
    partnerPrepCourse:
      partnerPrepCourseId ?? Math.floor(9999 + Math.random() * 9999),
  };
}

function generateRandomRG(): string {
  const length = Math.floor(Math.random() * 3) + 7; // Tamanho entre 7 e 9 dígitos
  let rg = '';

  // Gerar os dígitos numéricos
  for (let i = 0; i < length - 1; i++) {
    rg += Math.floor(Math.random() * 10); // Número entre 0 e 9
  }

  // Adicionar o último dígito, que pode ser um número ou 'X'
  const lastChar = Math.random() > 0.8 ? 'X' : Math.floor(Math.random() * 10); // 20% de chance de ser 'X'
  rg += lastChar;

  return rg;
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
