import { StatusApplication } from '../studentCourse/enums/stastusApplication';

/**
 * Quem a turma mostra como aluno: os Matriculados e os que terminaram o
 * período letivo com ela (Matrícula Encerrada). Sem os encerrados, a turma do
 * ano passado — em que o fim do período encerrou todo mundo — aparecia com 0
 * estudantes, e a gente perdia de vista quem passou por ela.
 *
 * Cancelados ficam de fora: têm a aba própria (toggle de cancelados).
 */
export const STATUS_DOS_ALUNOS_DA_TURMA: StatusApplication[] = [
  StatusApplication.Enrolled,
  StatusApplication.EnrollmentClosed,
];

export const eAlunoDaTurma = (status?: StatusApplication) =>
  !!status && STATUS_DOS_ALUNOS_DA_TURMA.includes(status);

/**
 * "Inscritos" de uma turma = os mesmos alunos da lista dela (ver acima).
 * Antes do card 15 (tickets-documentacao) contava todo estudante já ligado à
 * turma, inclusive cancelados.
 *
 * ⚠️ A regra de excluir a turma ("sem alunos") continua olhando o total, para
 * não apagar o histórico de quem passou por ela.
 */
export function contarMatriculados(
  alunos?: { applicationStatus?: StatusApplication }[],
): number {
  return (alunos ?? []).filter((a) => eAlunoDaTurma(a.applicationStatus))
    .length;
}
