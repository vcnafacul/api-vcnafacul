import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Period } from '../user/enum/period';
import { serieCompleta } from './serie-completa';

export type SituacaoDoProcesso = 'aberto' | 'encerrado' | 'futuro';

export type UltimoProcesso = {
  id: string;
  nome: string;
  cursinho: { id: string; nome: string };
  inicio: Date;
  fim: Date;
  situacao: SituacaoDoProcesso;
  inscricoes: number;
  matriculas: number;
};

export function situacaoDoProcesso(
  inicio: Date,
  fim: Date,
  agora = new Date(),
): SituacaoDoProcesso {
  if (agora < inicio) return 'futuro';
  if (agora > fim) return 'encerrado';
  return 'aberto';
}

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

  /**
   * Os últimos processos seletivos (D7): sem teste e sem excluídos, os mais
   * recentes por início. Inscrição = aluno sem `deleted_at`; matrícula =
   * `cod_enrolled` preenchido (a regra do `student-course/summary`).
   *
   * Uma consulta só: a tabela derivada escolhe os processos (o LIMIT antes do
   * JOIN), e o LEFT JOIN conta os alunos de cada um. Nunca N+1.
   */
  async ultimosProcessos(
    limite: number,
    cursinhoId?: string,
  ): Promise<UltimoProcesso[]> {
    const filtroCursinho = cursinhoId ? 'AND p.partner_prep_course_id = ?' : '';
    const params = cursinhoId ? [cursinhoId, limite] : [limite];
    const linhas: {
      id: string;
      nome: string;
      inicio: Date;
      fim: Date;
      cursinhoId: string;
      cursinhoNome: string;
      inscricoes: string;
      matriculas: string | null;
    }[] = await this.db.query(
      `SELECT ic.id, ic.name AS nome, ic.start_date AS inicio, ic.end_date AS fim,
              ppc.id AS cursinhoId, g.name AS cursinhoNome,
              COUNT(sc.id) AS inscricoes,
              SUM(CASE WHEN sc.cod_enrolled IS NOT NULL THEN 1 ELSE 0 END) AS matriculas
         FROM (
           SELECT p.id, p.name, p.start_date, p.end_date, p.partner_prep_course_id
             FROM inscription_course p
            WHERE p.is_test = 0
              AND p.deleted_at IS NULL
              ${filtroCursinho}
            ORDER BY p.start_date DESC, p.id
            LIMIT ?
         ) ic
         INNER JOIN partner_prep_course ppc ON ppc.id = ic.partner_prep_course_id
         INNER JOIN geolocations g ON g.id = ppc.geo_id
         LEFT JOIN student_course sc
           ON sc.inscriptionCourseId = ic.id
          AND sc.deleted_at IS NULL
        GROUP BY ic.id, ic.name, ic.start_date, ic.end_date, ppc.id, g.name
        ORDER BY ic.start_date DESC, ic.id`,
      params,
    );
    const agora = new Date();
    return linhas.map((l) => {
      const inicio = new Date(l.inicio);
      const fim = new Date(l.fim);
      return {
        id: l.id,
        nome: l.nome,
        cursinho: { id: l.cursinhoId, nome: l.cursinhoNome },
        inicio,
        fim,
        situacao: situacaoDoProcesso(inicio, fim, agora),
        inscricoes: Number(l.inscricoes),
        matriculas: Number(l.matriculas ?? 0),
      };
    });
  }
}
