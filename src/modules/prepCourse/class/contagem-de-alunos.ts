import { StatusApplication } from '../studentCourse/enums/stastusApplication';

/**
 * "Inscritos" de uma turma = só os Matriculados, como a lista de alunos dela
 * (tickets-documentacao, card 15). Antes contava todo estudante já ligado à
 * turma, inclusive cancelados e encerrados.
 *
 * ⚠️ A regra de excluir a turma ("sem alunos") continua olhando o total, para
 * não apagar o histórico de quem passou por ela.
 */
export function contarMatriculados(
  alunos?: { applicationStatus?: StatusApplication }[],
): number {
  return (alunos ?? []).filter(
    (a) => a.applicationStatus === StatusApplication.Enrolled,
  ).length;
}
