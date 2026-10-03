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

/** Faltas seguidas, sem justificativa, para o aluno aparecer como "sumindo". */
export const FALTAS_PARA_SUMIR = 3;

/** Um aluno ativo que faltou às últimas chamadas seguidas da turma (08). */
export interface AlunoSumindo {
  alunoId: string;
  turmaId: string;
  /** Faltas seguidas sem justificativa, da chamada mais recente para trás. */
  faltasSeguidas: number;
  /** Dia da última chamada com presença; `null` se nunca veio. */
  ultimaPresenca: string | null;
}

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
          chamadasAluno: 0,
          presencas: 0,
          faltasJustificadas: 0,
          aulasRegistradas: 0,
          sumindo: 0,
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

    // 07 — frequência: presenças e chamadas de cada turma até o dia
    // 08 — sumindo: ativo que faltou às últimas chamadas seguidas
    const ativos = alunos.filter((a) => !estavaCancelado(a));
    for (const s of await this.sumindoDasTurmas(ativos, dia)) {
      const m = porTurma.get(s.turmaId);
      m.sumindo = (m.sumindo as number) + 1;
    }

    for (const f of await this.chamadasDasTurmas(turmaIds, dia)) {
      Object.assign(porTurma.get(f.turmaId), {
        chamadasAluno: Number(f.chamadasAluno),
        presencas: Number(f.presencas),
        faltasJustificadas: Number(f.faltasJustificadas),
        aulasRegistradas: Number(f.aulasRegistradas),
      });
    }
    return porTurma;
  }

  /**
   * Presenças das turmas até o fim de `dia`, somando todos os alunos.
   *
   * ⚠️ `registeredAt` guarda só a data da chamada (meia-noite, sem fuso):
   * compara-se **dia com dia**. Comparar com o instante `fimDoDia` dependia do
   * fuso do processo (em UTC, a chamada do dia seguinte entrava na conta).
   *
   * A chamada só lista quem estava matriculado no dia dela
   * (`findOneByIdToAttendanceRecord`), então quem entrou depois ou saiu antes
   * não leva falta pelas aulas de fora — não precisa filtrar aqui.
   *
   * - `chamadasAluno`: uma linha por aluno por aula (o denominador);
   * - `faltasJustificadas`: falta com justificativa — não é presença (R5), mas
   *   a tela mostra quantas foram;
   * - `aulasRegistradas`: quantas chamadas a turma fez (com ou sem aluno).
   */
  async chamadasDasTurmas(turmaIds: string[], dia: string) {
    return this.em.query(
      `SELECT ar.classId AS turmaId,
              COUNT(sa.id) AS chamadasAluno,
              COALESCE(SUM(sa.present = 1), 0) AS presencas,
              COALESCE(SUM(sa.present = 0 AND aj.id IS NOT NULL), 0) AS faltasJustificadas,
              COUNT(DISTINCT ar.id) AS aulasRegistradas
         FROM attendance_record ar
         LEFT JOIN student_attendance sa
                ON sa.attendanceRecordId = ar.id AND sa.deleted_at IS NULL
         LEFT JOIN absence_justification aj
                ON aj.studentAttendanceId = sa.id AND aj.deleted_at IS NULL
        WHERE ar.classId IN (?)
          AND ar.deleted_at IS NULL
          AND DATE(ar.registeredAt) <= ?
        GROUP BY ar.classId`,
      [turmaIds, dia],
    ) as Promise<
      {
        turmaId: string;
        chamadasAluno: string;
        presencas: string;
        faltasJustificadas: string;
        aulasRegistradas: string;
      }[]
    >;
  }

  /**
   * Alunos ativos que faltaram às **últimas `FALTAS_PARA_SUMIR` chamadas
   * seguidas** da turma, até o fim de `dia` (tickets/033, card 08). Dia com
   * dia, como em `chamadasDasTurmas`.
   *
   * - Falta justificada interrompe a sequência (R6).
   * - Chamada em que o aluno não estava na lista (entrou depois) também
   *   interrompe: não é falta dele.
   * - Turma com menos chamadas que o limite: ninguém aparece.
   */
  async sumindoDasTurmas(
    ativos: AlunoDaTurma[],
    dia: string,
  ): Promise<AlunoSumindo[]> {
    if (ativos.length === 0) return [];
    const turmaIds = [...new Set(ativos.map((a) => a.turmaId))];
    const chamadas: { id: string; turmaId: string; dia: Date | string }[] =
      await this.em.query(
        `SELECT ar.id, ar.classId AS turmaId, ar.registeredAt AS dia
           FROM attendance_record ar
          WHERE ar.classId IN (?) AND ar.deleted_at IS NULL
            AND DATE(ar.registeredAt) <= ?
          ORDER BY ar.registeredAt DESC,
                   FIELD(ar.period, 'NOITE', 'TARDE', 'MANHA')`,
        [turmaIds, dia],
      );
    const porTurma = new Map<string, typeof chamadas>();
    for (const c of chamadas) {
      if (!porTurma.has(c.turmaId)) porTurma.set(c.turmaId, []);
      porTurma.get(c.turmaId).push(c);
    }
    const consideradas = chamadas.filter(
      (c) => porTurma.get(c.turmaId).length >= FALTAS_PARA_SUMIR,
    );
    if (consideradas.length === 0) return [];

    const linhas: {
      chamadaId: string;
      alunoId: string;
      presente: number;
      justificada: number;
    }[] = await this.em.query(
      `SELECT sa.attendanceRecordId AS chamadaId, sa.studentCourseId AS alunoId,
              sa.present AS presente, (aj.id IS NOT NULL) AS justificada
         FROM student_attendance sa
         LEFT JOIN absence_justification aj
                ON aj.studentAttendanceId = sa.id AND aj.deleted_at IS NULL
        WHERE sa.attendanceRecordId IN (?) AND sa.studentCourseId IN (?)
          AND sa.deleted_at IS NULL`,
      [consideradas.map((c) => c.id), ativos.map((a) => a.id)],
    );
    const linha = new Map(
      linhas.map((l) => [`${l.chamadaId}:${l.alunoId}`, l]),
    );

    const sumindo: AlunoSumindo[] = [];
    for (const aluno of ativos) {
      const daTurma = porTurma.get(aluno.turmaId) ?? [];
      if (daTurma.length < FALTAS_PARA_SUMIR) continue;
      let faltas = 0;
      let ultimaPresenca: string | null = null;
      let contando = true;
      for (const c of daTurma) {
        const l = linha.get(`${c.id}:${aluno.id}`);
        if (l && Number(l.presente)) {
          ultimaPresenca = diaDaChamada(c.dia);
          break;
        }
        if (!contando) continue;
        if (!l || Number(l.justificada)) contando = false;
        else faltas++;
      }
      if (faltas >= FALTAS_PARA_SUMIR)
        sumindo.push({
          alunoId: aluno.id,
          turmaId: aluno.turmaId,
          faltasSeguidas: faltas,
          ultimaPresenca,
        });
    }
    return sumindo;
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

/** O dia da chamada (`registeredAt` guarda a data escolhida, sem hora). */
function diaDaChamada(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${String(d.getDate()).padStart(2, '0')}`;
}
