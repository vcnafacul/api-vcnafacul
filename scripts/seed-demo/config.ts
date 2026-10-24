import { AttendancePeriod } from '../../src/modules/prepCourse/attendance/attendanceRecord/enum/attendance-period.enum';
import { somarDias } from './calendario';

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

/**
 * Processo seletivo com inscrições **abertas** no dia em que o seed roda
 * (tickets/053, Q5): a lista de processos mostra 1 "Ativo" + 3 "Encerrado".
 * Fora de `ANOS` de propósito — não tem período, turma, frequência nem
 * indicador; só o processo (04) e inscritos "Em Análise" (08).
 */
export const PROCESSO_ABERTO = {
  ano: 2027,
  /** Começou há 10 dias e vai até daqui a 30 (relativo a `hoje`). */
  diasDesdeInicio: 10,
  diasAteFim: 30,
  inscritos: 9,
} as const;

/** Datas do processo aberto, em UTC meia-noite (como `datasDoAno`). */
export const datasDoProcessoAberto = (hoje: Date) => ({
  inscricaoInicio: somarDias(hoje, -PROCESSO_ABERTO.diasDesdeInicio),
  inscricaoFim: somarDias(hoje, PROCESSO_ABERTO.diasAteFim),
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
