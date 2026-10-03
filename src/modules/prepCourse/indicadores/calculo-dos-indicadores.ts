import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { StatusApplication } from '../studentCourse/enums/stastusApplication';
import { DESCRICAO_DA_REATIVACAO } from '../studentCourse/log-student/descricoes-do-log';
import { fimDoDia } from './datas';
import { Metricas } from './metricas';
import {
  MOTIVO_DESISTENCIA_INICIAL,
  motivoDoCancelamento,
} from './motivos-de-cancelamento';

/** Um aluno de uma turma, com as datas que os indicadores usam. */
export interface AlunoDaTurma {
  id: string;
  turmaId: string;
  /** Quando a matrícula foi confirmada. */
  matriculadoEm: Date;
  /** Último cancelamento até o dia de referência. */
  canceladoEm: Date | null;
  /** Última reativação até o dia de referência. */
  reativadoEm: Date | null;
  /** Texto do último cancelamento até o dia (o motivo escolhido). */
  descricaoDoCancelamento: string | null;
}

/**
 * A matrícula estava cancelada no dia? Sim se houve cancelamento e nenhuma
 * reativação depois dele. Empate no mesmo segundo conta como reativado: a
 * reativação só existe depois de um cancelamento.
 */
export const estavaCancelado = (a: AlunoDaTurma) =>
  !!a.canceladoEm && (!a.reativadoEm || a.canceladoEm > a.reativadoEm);

/**
 * A ÚNICA conta dos indicadores (tickets/033). O cron do snapshot, a leitura
 * ao vivo e o backfill passam todos por aqui — por isso o número da tela de
 * hoje bate com a foto gravada à noite.
 *
 * ⚠️ Calcula pela **data dos eventos** (logs de matrícula e cancelamento,
 * data da chamada), nunca pelo status atual: assim dá para calcular qualquer
 * dia do passado, e o fechamento do período não muda o resultado.
 *
 * Cada card da série acrescenta suas chaves em `calcular`.
 */
@Injectable()
export class CalculoDosIndicadores {
  constructor(
    @InjectEntityManager()
    protected readonly em: EntityManager,
  ) {}

  /**
   * Métricas de cada turma ao fim de `dia` (`YYYY-MM-DD`, São Paulo).
   */
  async calcular(
    turmaIds: string[],
    dia: string,
  ): Promise<Map<string, Metricas>> {
    const porTurma = new Map<string, Metricas>(
      turmaIds.map((id) => [
        id,
        {
          alunos: 0,
          ativos: 0,
          cancelados: 0,
          canceladosPorMotivo: {},
          desistenciaInicial: 0,
        } as Metricas,
      ]),
    );
    if (turmaIds.length === 0) return porTurma;

    const ate = fimDoDia(dia);
    const alunos = await this.alunosDasTurmas(turmaIds, ate);

    for (const a of alunos) {
      const m = porTurma.get(a.turmaId);
      // 02 — alunos do período: matrícula confirmada até o dia
      m.alunos = (m.alunos as number) + 1;
      // 03 — ativos: e sem cancelamento valendo no dia
      if (!estavaCancelado(a)) {
        m.ativos = (m.ativos as number) + 1;
        continue;
      }
      // 04 — cancelamentos, pelo motivo escolhido
      m.cancelados = (m.cancelados as number) + 1;
      const motivo = motivoDoCancelamento(a.descricaoDoCancelamento);
      const porMotivo = m.canceladosPorMotivo as Record<string, number>;
      porMotivo[motivo] = (porMotivo[motivo] ?? 0) + 1;
      if (motivo === MOTIVO_DESISTENCIA_INICIAL)
        m.desistenciaInicial = (m.desistenciaInicial as number) + 1;
    }
    return porTurma;
  }

  /**
   * Alunos que tiveram a matrícula confirmada nas turmas até `ate`.
   *
   * - **Matriculado alguma vez** = tem número de matrícula (`cod_enrolled`):
   *   ele nasce na confirmação e nunca é apagado — nem no cancelamento nem no
   *   fim do período.
   * - **Data da matrícula** = o primeiro log "Matriculado". Só a confirmação
   *   (`confirmEnrolled`) leva a esse status (a reativação vem depois, e a
   *   troca de turma também grava "Matriculado", mas nunca antes dela). Sem log
   *   (registro antigo), vale a data da seleção e, por último, a do cadastro.
   * - **Turma** = a atual: a troca de turma não tem histórico.
   * - **Cancelamento e reativação** = os últimos até `ate`, pelos logs — o
   *   status atual não serve: o fim do período põe todo mundo em "Encerrada".
   */
  async alunosDasTurmas(
    turmaIds: string[],
    ate: Date,
  ): Promise<AlunoDaTurma[]> {
    const linhas: {
      id: string;
      turmaId: string;
      matriculadoEm: Date;
      canceladoEm: Date | null;
      reativadoEm: Date | null;
      descricaoDoCancelamento: string | null;
    }[] = await this.em.query(
      `SELECT * FROM (
         SELECT sc.id, sc.classId AS turmaId,
                COALESCE(
                  (SELECT MIN(l.created_at) FROM log_student l
                    WHERE l.student_id = sc.id AND l.applicationStatus = ?),
                  sc.selectEnrolledAt,
                  sc.created_at
                ) AS matriculadoEm,
                (SELECT MAX(l.created_at) FROM log_student l
                  WHERE l.student_id = sc.id AND l.applicationStatus = ?
                    AND l.created_at <= ?) AS canceladoEm,
                (SELECT l.description FROM log_student l
                  WHERE l.student_id = sc.id AND l.applicationStatus = ?
                    AND l.created_at <= ?
                  ORDER BY l.created_at DESC LIMIT 1) AS descricaoDoCancelamento,
                (SELECT MAX(l.created_at) FROM log_student l
                  WHERE l.student_id = sc.id AND l.applicationStatus = ?
                    AND l.description = ? AND l.created_at <= ?) AS reativadoEm
           FROM student_course sc
          WHERE sc.classId IN (?)
            AND sc.deleted_at IS NULL
            AND sc.cod_enrolled IS NOT NULL
       ) a
       WHERE a.matriculadoEm <= ?`,
      [
        StatusApplication.Enrolled,
        StatusApplication.EnrollmentCancelled,
        ate,
        StatusApplication.EnrollmentCancelled,
        ate,
        StatusApplication.Enrolled,
        DESCRICAO_DA_REATIVACAO,
        ate,
        turmaIds,
        ate,
      ],
    );
    const data = (d: Date | null) => (d ? new Date(d) : null);
    return linhas.map((l) => ({
      ...l,
      matriculadoEm: new Date(l.matriculadoEm),
      canceladoEm: data(l.canceladoEm),
      reativadoEm: data(l.reativadoEm),
    }));
  }
}
