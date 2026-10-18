import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Period } from '../user/enum/period';
import { serieCompleta } from './serie-completa';

export type UltimoAcessoDoCursinho = {
  period: string;
  colaboradores: number;
  estudantes: number;
};

/** O mesmo agrupamento do `aggregateUsersByLastAcess` da plataforma. */
function periodoDe(coluna: string, groupBy: Period): string {
  switch (groupBy) {
    case Period.day:
      return `DATE_FORMAT(${coluna}, '%Y-%m-%d')`;
    case Period.month:
      return `DATE_FORMAT(${coluna}, '%Y-%m')`;
    case Period.year:
      return `YEAR(${coluna})`;
    default:
      throw new Error('Invalid groupBy value');
  }
}

/**
 * Consultas do Monitoramento por cursinho (tickets/044) que não pertencem a um
 * repositório só: juntam usuário, colaborador, aluno e processo.
 */
@Injectable()
export class MonitoramentoRepository {
  constructor(@InjectEntityManager() private readonly db: EntityManager) {}

  /**
   * Último acesso dos usuários do cursinho, em duas séries (D1):
   * - colaboradores **ativos** do cursinho (`collaborators` sem `deleted_at`);
   * - estudantes com inscrição não excluída em processo **não teste** do cursinho.
   * Quem é os dois conta nas duas. Cada usuário conta uma vez por série.
   */
  async ultimoAcesso(
    cursinhoId: string,
    groupBy: Period,
  ): Promise<UltimoAcessoDoCursinho[]> {
    const periodo = periodoDe('u.lastAccess', groupBy);
    const [colaboradores, estudantes]: {
      period: string | number;
      total: string;
    }[][] = await Promise.all([
      this.db.query(
        `SELECT ${periodo} AS period, COUNT(DISTINCT u.id) AS total
             FROM users u
             INNER JOIN collaborators c
               ON c.user_id = u.id
              AND c.partner_prep_course_id = ?
              AND c.deleted_at IS NULL
            WHERE u.lastAccess IS NOT NULL
            GROUP BY period`,
        [cursinhoId],
      ),
      this.db.query(
        `SELECT ${periodo} AS period, COUNT(DISTINCT u.id) AS total
             FROM users u
             INNER JOIN student_course sc
               ON sc.user_id = u.id
              AND sc.partner_prep_course_id = ?
              AND sc.deleted_at IS NULL
             INNER JOIN inscription_course ic
               ON ic.id = sc.inscriptionCourseId
              AND ic.is_test = 0
            WHERE u.lastAccess IS NOT NULL
            GROUP BY period`,
        [cursinhoId],
      ),
    ]);

    const porPeriodo = new Map<string, UltimoAcessoDoCursinho>();
    const somar = (
      linhas: { period: string | number; total: string }[],
      campo: 'colaboradores' | 'estudantes',
    ) => {
      for (const l of linhas) {
        const period = String(l.period);
        const atual = porPeriodo.get(period) ?? {
          period,
          colaboradores: 0,
          estudantes: 0,
        };
        atual[campo] = Number(l.total);
        porPeriodo.set(period, atual);
      }
    };
    somar(colaboradores, 'colaboradores');
    somar(estudantes, 'estudantes');

    // Série completa: período sem acesso nenhum aparece com zeros.
    return serieCompleta(groupBy, [...porPeriodo.keys()]).map(
      (period) =>
        porPeriodo.get(period) ?? { period, colaboradores: 0, estudantes: 0 },
    );
  }
}
