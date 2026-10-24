import { AttendancePeriod } from '../../src/modules/prepCourse/attendance/attendanceRecord/enum/attendance-period.enum';

export const CURSINHO = {
  nome: 'Cursinho Popular Semear',
  cep: '05508-010',
  estado: 'SP',
  cidade: 'São Paulo',
  bairro: 'Butantã',
  rua: 'Rua do Matão, 1010',
  latitude: -23.5613,
  longitude: -46.7307,
};

/** Domínio de todo e-mail que o seed cria; o `00` apaga usuários por ele. */
export const DOMINIO_DEMO = 'demo.vcnafacul.local';

export const REPRESENTANTE = {
  email: `fernando@${DOMINIO_DEMO}`,
  firstName: 'Fernando',
  lastName: 'Almeida',
  phone: '11987654321',
  birthday: '1990-05-10',
  state: 'SP',
  city: 'São Paulo',
};

export const ANOS = [2024, 2025, 2026] as const;
export type Ano = (typeof ANOS)[number];
export const ANO_ATUAL: Ano = 2026;

/** Datas em UTC meia-noite, como a api grava (`datas.ts`). */
export const datasDoAno = (ano: number) => ({
  inscricaoInicio: new Date(Date.UTC(ano, 0, 5)),
  inscricaoFim: new Date(Date.UTC(ano, 1, 20)),
  periodoInicio: new Date(Date.UTC(ano, 2, 2)),
  periodoFim: new Date(Date.UTC(ano, 11, 11)),
});

export const TURMAS = [
  { nome: 'Turma Manhã', periodo: AttendancePeriod.MANHA, dias: [2, 4] }, // ter/qui
  { nome: 'Turma Tarde', periodo: AttendancePeriod.TARDE, dias: [1, 3] }, // seg/qua
  { nome: 'Turma Noite', periodo: AttendancePeriod.NOITE, dias: [2, 4] },
] as const;

/** Alunos por turma em cada ano (soma 135, não uniforme). */
export const ALUNOS_POR_TURMA: Record<Ano, [number, number, number]> = {
  2024: [16, 14, 15],
  2025: [13, 17, 15],
  2026: [15, 16, 14],
};

/** Fração que cancela no ano (2026 conta só até hoje). */
export const EVASAO: Record<Ano, number> = {
  2024: 0.22,
  2025: 0.18,
  2026: 0.15,
};
/** Dos cancelamentos, quantos são "Desistência inicial" (6 primeiras semanas). */
export const FRACAO_DESISTENCIA_INICIAL = 0.5;

export const COLABORADORES = [
  { papel: 'Coordenação pedagógica', role: 'secretaria' },
  { papel: 'Secretaria', role: 'secretaria' },
  { papel: 'Professor(a) de Matemática', role: 'professor' },
  { papel: 'Professor(a) de Redação', role: 'professor' },
  { papel: 'Professor(a) de Biologia', role: 'professor' },
] as const;
