import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

/**
 * As rotas de frequência só conferiam a permissão — que vale para o cursinho
 * de quem pede, não para a turma pedida. Com um id de outro cursinho (o da
 * turma aparece na URL da tela), dava para exportar os contatos dos alunos,
 * apagar chamadas e sobrescrever justificativas (tickets-documentacao,
 * card 13).
 *
 * Cada método resolve a entrada até o cursinho e responde **404** se não for
 * o de quem pede — a mesma resposta de "não existe", como `cursinhoDaTurma` e
 * `StudentCourseService.garantirDoCursinho`.
 */
@Injectable()
export class EscopoDaFrequencia {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  private async cursinhoDe(userId: string): Promise<string | null> {
    const [c] = await this.em.query(
      `SELECT partner_prep_course_id AS id FROM collaborators WHERE user_id = ?`,
      [userId],
    );
    return c?.id ?? null;
  }

  /**
   * Quantos dos `ids` são do cursinho de quem pede; `sql` recebe os ids e o
   * cursinho e devolve `n`.
   */
  private async garantir(
    userId: string,
    ids: string[],
    sql: string,
    mensagem: string,
  ): Promise<void> {
    const unicos = [...new Set(ids.filter(Boolean))];
    if (unicos.length === 0) throw new NotFoundException(mensagem);
    const cursinho = await this.cursinhoDe(userId);
    if (!cursinho) throw new NotFoundException(mensagem);
    const [{ n }] = await this.em.query(sql, [unicos, cursinho]);
    // Um só de fora recusa tudo: nada é lido nem gravado pela metade.
    if (Number(n) !== unicos.length) throw new NotFoundException(mensagem);
  }

  turma(classId: string, userId: string) {
    return this.garantir(
      userId,
      [classId],
      `SELECT COUNT(*) AS n FROM classes
        WHERE id IN (?) AND partner_prep_course_id = ?`,
      'Turma não encontrada',
    );
  }

  chamadas(attendanceRecordIds: string[], userId: string) {
    return this.garantir(
      userId,
      attendanceRecordIds,
      `SELECT COUNT(*) AS n FROM attendance_record ar
         JOIN classes c ON c.id = ar.classId
        WHERE ar.id IN (?) AND c.partner_prep_course_id = ?`,
      'Registro de presença não encontrado',
    );
  }

  presencas(studentAttendanceIds: string[], userId: string) {
    return this.garantir(
      userId,
      studentAttendanceIds,
      `SELECT COUNT(*) AS n FROM student_attendance sa
         JOIN attendance_record ar ON ar.id = sa.attendanceRecordId
         JOIN classes c ON c.id = ar.classId
        WHERE sa.id IN (?) AND c.partner_prep_course_id = ?`,
      'Presença não encontrada',
    );
  }

  aluno(studentCourseId: string, userId: string) {
    return this.garantir(
      userId,
      [studentCourseId],
      `SELECT COUNT(*) AS n FROM student_course
        WHERE id IN (?) AND partner_prep_course_id = ?`,
      'Estudante não encontrado',
    );
  }

  justificativaDePeriodo(id: string, userId: string) {
    return this.garantir(
      userId,
      [id],
      `SELECT COUNT(*) AS n FROM period_justification pj
         JOIN student_course sc ON sc.id = pj.student_course_id
        WHERE pj.id IN (?) AND sc.partner_prep_course_id = ?`,
      'Justificativa de período não encontrada',
    );
  }
}
