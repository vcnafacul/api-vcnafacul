import { chance, escolher, faker } from './aleatorio';

export const JUSTIFICATIVAS = [
  'Consulta médica',
  'Atestado médico',
  'Trabalho',
  'Problema com transporte',
  'Assunto familiar',
] as const;

export interface AlunoNaTurma {
  matriculadoEm: Date;
  saidaEm: Date | null;
  sumindoDesde: Date | null;
  assiduidade: number;
}

/** A maioria vem quase sempre; alguns faltam mais. */
export const assiduidadeBase = () =>
  chance(0.8)
    ? faker.number.float({ min: 0.88, max: 0.98 })
    : faker.number.float({ min: 0.75, max: 0.88 });

/** `null` = o aluno não está na lista desta chamada. */
export function presencaNaChamada(a: AlunoNaTurma, dia: Date) {
  if (dia < a.matriculadoEm) return null;
  if (a.saidaEm && dia >= a.saidaEm) return null;
  if (a.sumindoDesde && dia >= a.sumindoDesde)
    return { presente: false, justificativa: null };
  if (chance(a.assiduidade)) return { presente: true, justificativa: null };
  return {
    presente: false,
    justificativa: chance(0.3) ? escolher(JUSTIFICATIVAS) : null,
  };
}
