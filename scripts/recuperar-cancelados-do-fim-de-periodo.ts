import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * Até o tickets/033 card 00, o cron que fecha o período letivo punha TODO
 * estudante das turmas em "Matrícula Encerrada" — inclusive quem estava com a
 * matrícula cancelada. O status perdeu o cancelamento, mas o histórico
 * (`log_student`) não: este script devolve "Matrícula Cancelada" a quem está
 * encerrado e cujo último cancelamento não foi seguido de reativação.
 *
 * Uso:
 *   yarn periodo:recuperar-cancelados            # dry-run: só lista
 *   yarn periodo:recuperar-cancelados --apply    # restaura
 *
 * Não grava log novo de propósito: o histórico já tem o cancelamento, e um
 * segundo log "Matrícula Cancelada" passaria a ser o "último cancelamento" —
 * a aba Cancelados da turma e o relatório de motivos mostrariam o texto do
 * script no lugar do motivo escolhido pelo cursinho.
 *
 * Idempotente: depois de aplicado, ninguém mais casa com o critério.
 * Config: MY_HOST, MY_PORT, MY_USER, MY_PASSWORD, MY_DB_NAME (.env ou ambiente).
 */

const ENCERRADA = 'Matrícula Encerrada';
const CANCELADA = 'Matrícula Cancelada';
const MATRICULADO = 'Matriculado';
// A reativação é o único caminho de volta do cancelamento. Não dá para olhar
// só o status do log: trocar de turma também grava "Matriculado".
const REATIVADA = 'Matrícula reativada';

interface Caso {
  id: string;
  cursinho: string;
  periodo: string;
  ano: number;
}

async function main() {
  const apply = process.argv.includes('--apply');

  const ds = new DataSource({
    type: 'mysql',
    host: process.env.MY_HOST,
    port: Number(process.env.MY_PORT),
    username: process.env.MY_USER,
    password: process.env.MY_PASSWORD,
    database: process.env.MY_DB_NAME,
    entities: [],
    synchronize: false,
    timezone: 'Z',
  });
  await ds.initialize();

  try {
    const casos: Caso[] = await ds.query(
      `SELECT sc.id, COALESCE(g.name, sc.partner_prep_course_id) AS cursinho,
              cp.name AS periodo, cp.year AS ano
         FROM student_course sc
         JOIN classes c ON c.id = sc.classId
         JOIN course_periods cp ON cp.id = c.course_period_id
         LEFT JOIN partner_prep_course pp ON pp.id = sc.partner_prep_course_id
         LEFT JOIN geolocations g ON g.id = pp.geo_id
        WHERE sc.applicationStatus = ?
          AND sc.deleted_at IS NULL
          AND cp.endDate < NOW()
          AND (SELECT MAX(l.created_at) FROM log_student l
                WHERE l.student_id = sc.id AND l.applicationStatus = ?)
              > COALESCE(
                  (SELECT MAX(l.created_at) FROM log_student l
                    WHERE l.student_id = sc.id AND l.applicationStatus = ?
                      AND l.description = ?),
                  '1970-01-01')`,
      [ENCERRADA, CANCELADA, MATRICULADO, REATIVADA],
    );

    const porGrupo = new Map<string, number>();
    for (const c of casos) {
      const chave = `${c.cursinho} — ${c.periodo} (${c.ano})`;
      porGrupo.set(chave, (porGrupo.get(chave) ?? 0) + 1);
    }

    console.log(
      `\nMatrículas canceladas que o fim do período encerrou: ${casos.length}`,
    );
    for (const [grupo, n] of [...porGrupo].sort()) {
      console.log(`  ${String(n).padStart(4)}  ${grupo}`);
    }

    if (!apply) {
      console.log('\nDry-run. Rode com --apply para restaurar.');
      return;
    }
    if (casos.length === 0) return;

    const ids = casos.map((c) => c.id);
    await ds.query(
      `UPDATE student_course SET applicationStatus = ?, updated_at = NOW()
        WHERE id IN (?) AND applicationStatus = ?`,
      [CANCELADA, ids, ENCERRADA],
    );
    console.log(`\nRestauradas: ${ids.length}`);
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
