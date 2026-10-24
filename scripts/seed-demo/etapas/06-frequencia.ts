import { randomUUID } from 'crypto';
import { EntityTarget, ObjectLiteral } from 'typeorm';
import { AbsenceJustification } from '../../../src/modules/prepCourse/attendance/absenceJustification/absence-justification.entity';
import { AttendanceRecord } from '../../../src/modules/prepCourse/attendance/attendanceRecord/attendance-record.entity';
import { AttendancePeriod } from '../../../src/modules/prepCourse/attendance/attendanceRecord/enum/attendance-period.enum';
import { StudentAttendance } from '../../../src/modules/prepCourse/attendance/studentAttendance/student-attendance.entity';
import { datasDoAno, TURMAS } from '../config';
import { diasDeChamada, menor, somarDias } from '../calendario';
import { Contexto } from '../contexto';
import { assiduidadeBase, presencaNaChamada } from '../presenca';

const HORA = 60 * 60 * 1000;

/** Hora (UTC) em que a chamada "foi feita": 10h, 15h e 20h de São Paulo. */
const HORA_DA_CHAMADA_UTC: Record<AttendancePeriod, number> = {
  [AttendancePeriod.MANHA]: 13,
  [AttendancePeriod.TARDE]: 18,
  [AttendancePeriod.NOITE]: 23,
};

async function emLotes<T extends ObjectLiteral>(
  ctx: Contexto,
  entidade: EntityTarget<T>,
  linhas: Record<string, unknown>[],
) {
  for (let i = 0; i < linhas.length; i += 500)
    await ctx.ds
      .createQueryBuilder()
      .insert()
      .into(entidade)
      .values(linhas.slice(i, i + 500) as never)
      .updateEntity(false)
      .execute();
}

/**
 * Chamadas de cada turma do início do período até ontem (hoje é dia de
 * chamada ao vivo no vídeo), com presença e justificativas.
 *
 * `registeredAt`: o client manda a meia-noite de São Paulo
 * (`toBrazilStartOfDayISOString`) e a api grava com o fuso do processo (sem
 * `timezone` no TypeORM) — na máquina do demo (fuso de SP) fica `AAAA-MM-DD
 * 00:00:00`. A conexão do seed usa `timezone: 'Z'`, então o `dia` (meia-noite
 * UTC do calendário) grava exatamente esse valor, e o `DATE(registeredAt)`
 * dos indicadores e da tela dá o dia certo.
 */
export async function executar(ctx: Contexto) {
  const chamadas: Record<string, unknown>[] = [];
  const presencas: Record<string, unknown>[] = [];
  const justificativas: Record<string, unknown>[] = [];
  const ontem = somarDias(ctx.hoje, -1);

  for (const turma of ctx.turmas) {
    const config = TURMAS.find((t) => turma.nome.startsWith(t.nome));
    if (!config) throw new Error(`Turma sem configuração: ${turma.nome}`);
    const d = datasDoAno(turma.ano);
    const alunos = ctx.alunos
      .filter((a) => a.turmaId === turma.id)
      .map((a) => ({ ...a, assiduidade: assiduidadeBase() }));

    for (const dia of diasDeChamada(
      d.periodoInicio,
      menor(d.periodoFim, ontem),
      config.dias,
    )) {
      const feitaEm = new Date(
        dia.getTime() + HORA_DA_CHAMADA_UTC[config.periodo] * HORA,
      );
      const recordId = randomUUID();
      chamadas.push({
        id: recordId,
        class: { id: turma.id },
        registeredBy: { id: turma.professorId },
        registeredAt: dia,
        period: config.periodo,
        createdAt: feitaEm,
        updatedAt: feitaEm,
      });
      for (const a of alunos) {
        const p = presencaNaChamada(a, dia);
        if (!p) continue;
        const id = randomUUID();
        presencas.push({
          id,
          studentCourse: { id: a.studentId },
          attendanceRecord: { id: recordId },
          present: p.presente,
          createdAt: feitaEm,
          updatedAt: feitaEm,
        });
        if (p.justificativa)
          justificativas.push({
            id: randomUUID(),
            studentAttendance: { id },
            justification: p.justificativa,
            createdAt: feitaEm,
            updatedAt: feitaEm,
          });
      }
    }
  }
  await emLotes(ctx, AttendanceRecord, chamadas);
  await emLotes(ctx, StudentAttendance, presencas);
  await emLotes(ctx, AbsenceJustification, justificativas);
  console.log(
    `06 frequência: ${chamadas.length} chamadas, ${presencas.length} presenças, ${justificativas.length} justificativas`,
  );
}
