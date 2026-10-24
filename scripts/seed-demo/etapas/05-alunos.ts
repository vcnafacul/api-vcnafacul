import { InscriptionCourse } from '../../../src/modules/prepCourse/InscriptionCourse/inscription-course.entity';
import { StatusApplication as S } from '../../../src/modules/prepCourse/studentCourse/enums/stastusApplication';
import { entre, faker } from '../aleatorio';
import { inicioDoDia, somarDias } from '../calendario';
import {
  ALUNOS_POR_TURMA,
  ANO_ATUAL,
  ANOS,
  EVASAO,
  datasDoAno,
} from '../config';
import { Contexto } from '../contexto';
import { planejarHistorias } from '../historia';
import { criarInscritor, emSP } from '../inscricao';

/**
 * Datas, em dois formatos (ver 04 e 06):
 * - `log_student.created_at` / `student_course.created_at` (timestamp) são
 *   instantes em hora do dia de São Paulo (`emSP`, em `inscricao.ts`).
 * - `selectEnrolledAt` / `limitEnrolledAt` (datetime) são horário de parede
 *   de SP: o `scheduleEnrolled` grava `setHours(0,0,0,0)` com TZ=SP, e a
 *   conexão `Z` do seed grava as partes UTC como o texto — então
 *   `meiaNoiteSP(dia)` = meia-noite UTC do dia.
 */
const meiaNoiteSP = inicioDoDia;
/** `toLocaleDateString('pt-BR')` de uma meia-noite de SP. */
const dataBR = (dia: Date) =>
  `${String(dia.getUTCDate()).padStart(2, '0')}/${String(dia.getUTCMonth() + 1).padStart(2, '0')}/${dia.getUTCFullYear()}`;

/** Texto exato do `scheduleEnrolled` (com o "concovação" do original). */
const descricaoDaConvocacao = (inicio: Date, limite: Date) =>
  `Convocado para matricular em ${dataBR(inicio)} com limite de concovação para ${dataBR(limite)}`;

/** Prazo de 5 dias; `limitEnrolledAt` = dia seguinte ao prazo, 00:00 (como o service). */
const PRAZO_DIAS = 5;
const datasDaConvocacao = (convocadoEm: Date) => {
  const selectEnrolledAt = meiaNoiteSP(convocadoEm);
  return {
    selectEnrolledAt,
    limitEnrolledAt: somarDias(selectEnrolledAt, PRAZO_DIAS + 1),
  };
};

const AREAS = [
  'Lingua Portuguesa',
  'Lingua Estrangeira',
  'Biologia',
  'Fisica',
  'Quimica',
  'Matematica',
  'Historia',
  'Geografia',
] as const;
const CURSOS = [
  'Medicina',
  'Direito',
  'Enfermagem',
  'Engenharia Civil',
  'Psicologia',
  'Pedagogia',
  'Administração',
  'Ciência da Computação',
  'Arquitetura e Urbanismo',
  'Biologia',
  'História',
  'Letras',
] as const;

type Candidato =
  | 'convocado'
  | 'declarou-interesse'
  | 'lista-de-espera'
  | 'em-analise'
  | 'indeferido'
  | 'nao-declarou';

/**
 * A "2ª chamada" de 2026 (spec D3) — inscritos no processo de 2026 que não
 * entraram na 1ª chamada. `declarou-interesse` é o da cena ao vivo: só quem
 * "Declarou Interesse" tem o botão "Confirmação de Matrícula" na tela do
 * processo (`confirmEnrolled` exige esse status); o `convocado` fica para
 * mostrar a convocação com prazo correndo.
 */
const CANDIDATOS_EXTRAS: Candidato[] = [
  'convocado',
  'declarou-interesse',
  'lista-de-espera',
  'em-analise',
  'indeferido',
  'nao-declarou',
];

export async function executar(ctx: Contexto) {
  if (!ctx.cursinhoId) throw new Error('05 alunos: rode o 02 antes');
  const processos = ctx.ds.getRepository(InscriptionCourse);
  const nomesDasTurmas = new Map(ctx.turmas.map((t) => [t.id, t.nome]));
  const { log, criarPessoa, criarInscricao, gravar } =
    await criarInscritor(ctx);

  /** Convocação (log de agendamento + e-mail do cron). Devolve as datas do aluno. */
  function convocar(studentId: string, convocadoEm: Date) {
    const { selectEnrolledAt, limitEnrolledAt } =
      datasDaConvocacao(convocadoEm);
    // a coordenação agenda na véspera; o cron das 00:00 manda o e-mail
    log(
      studentId,
      S.CalledForEnrollment,
      descricaoDaConvocacao(selectEnrolledAt, limitEnrolledAt),
      emSP(somarDias(convocadoEm, -1), 16, entre(0, 59)),
    );
    log(
      studentId,
      S.CalledForEnrollment,
      'Email de convocação enviado (em lote)',
      emSP(convocadoEm, 0, 1),
    );
    return { selectEnrolledAt, limitEnrolledAt };
  }

  /** Passos da declaração de interesse, na ordem que a tela exige. */
  function declarar(studentId: string, ano: number, dia: Date) {
    const hora = entre(9, 20);
    let minuto = entre(0, 20);
    if (ano === ANO_ATUAL)
      log(
        studentId,
        S.CalledForEnrollment,
        'Enviou documentos',
        emSP(dia, hora, minuto++),
      );
    log(
      studentId,
      S.CalledForEnrollment,
      'Enviou foto carteirinha',
      emSP(dia, hora, (minuto += 3)),
    );
    log(
      studentId,
      S.CalledForEnrollment,
      'Respondeu pesquisa',
      emSP(dia, hora, (minuto += 4)),
    );
    log(
      studentId,
      S.DeclaredInterest,
      'Declarou interesse',
      emSP(dia, hora, (minuto += 2)),
    );
  }

  const pesquisa = () => ({
    areaInterest: JSON.stringify(
      faker.helpers.arrayElements(AREAS, { min: 1, max: 3 }),
    ),
    selectedCourses: JSON.stringify(
      faker.helpers.arrayElements(CURSOS, { min: 1, max: 2 }),
    ),
    photoDone: true,
    surveyDone: true,
  });

  // ── Matriculados de cada ano (história completa) ───────────────────────────
  for (const ano of ANOS) {
    const turmas = ctx.turmas.filter((t) => t.ano === ano);
    const qtd = ALUNOS_POR_TURMA[ano];
    const historias = planejarHistorias(
      ano,
      qtd[0] + qtd[1] + qtd[2],
      EVASAO[ano],
      ctx.hoje,
    );
    let seq = 0;
    for (const [iTurma, turma] of turmas.entries()) {
      for (let k = 0; k < qtd[iTurma]; k++) {
        const h = historias[seq++];
        const inscritoEm = emSP(h.inscritoEm, entre(8, 20), entre(0, 59));
        const u = await criarPessoa(ano, somarDias(inscritoEm, -entre(0, 3)));
        // gerado em ordem de matrícula do ano: o `generateEnrolledCode` pega o
        // maior e soma 1 → a confirmação ao vivo vira `${ANO_ATUAL}00NN+1`
        const cod = `${ano}${String(seq).padStart(4, '0')}`;
        const sc = await criarInscricao(
          ano,
          u,
          {
            applicationStatus: h.statusFinal,
            cod_enrolled: cod,
            class: { id: turma.id } as never,
            selectEnrolled: false, // o scheduleEnrolled zera ao convocar
            ...datasDaConvocacao(h.convocadoEm),
            documentsDone: ano === ANO_ATUAL, // só 2026 pede documentos
            ...pesquisa(),
          },
          inscritoEm,
        );
        convocar(sc.id, h.convocadoEm);
        declarar(sc.id, ano, somarDias(h.matriculadoEm, -1));
        // `confirmEnrolled`: updateClass grava o log da turma, depois o número
        const matriculouEm = emSP(h.matriculadoEm, entre(9, 17), entre(0, 50));
        log(
          sc.id,
          S.Enrolled,
          `Atribuído à Turma: ${nomesDasTurmas.get(turma.id)} (${ano})`,
          matriculouEm,
        );
        log(
          sc.id,
          S.Enrolled,
          `Numero de Matrícula: ${cod}`,
          new Date(matriculouEm.getTime() + 1000),
        );
        if (h.saida)
          log(
            sc.id,
            S.EnrollmentCancelled,
            h.saida.motivo,
            emSP(h.saida.data, entre(9, 19), entre(0, 59)),
          );
        else if (h.statusFinal === S.EnrollmentClosed)
          // cron da meia-noite (SP) do dia seguinte ao fim do período
          log(
            sc.id,
            S.EnrollmentClosed,
            `Matrícula encerrada pelo fim do período letivo "Ano letivo ${ano}" (${ano})`,
            emSP(somarDias(datasDoAno(ano).periodoFim, 1), 0, 0),
          );
        ctx.alunos.push({
          studentId: sc.id,
          userId: u.id,
          ano,
          turmaId: turma.id,
          matriculadoEm: h.matriculadoEm,
          saidaEm: h.saida?.data ?? null,
          sumindoDesde: h.sumindoDesde,
        });
      }
    }
  }

  // ── 2ª chamada de 2026 ──────────────────────────────────────────────────────
  const d = datasDoAno(ANO_ATUAL);
  const primeiraChamada = somarDias(d.inscricaoFim, 2);
  let naListaDeEspera: string | null = null;
  for (const tipo of CANDIDATOS_EXTRAS) {
    // inscritos dentro do prazo do processo, como todo mundo
    const inscritoEm = emSP(
      somarDias(d.inscricaoInicio, entre(0, 40)),
      entre(8, 20),
      entre(0, 59),
    );
    const u = await criarPessoa(ANO_ATUAL, inscritoEm);

    if (tipo === 'lista-de-espera') {
      const sc = await criarInscricao(
        ANO_ATUAL,
        u,
        { applicationStatus: S.UnderReview, waitingList: true },
        inscritoEm,
      );
      log(
        sc.id,
        S.UnderReview,
        'Adicionou estudante na lista de espera',
        emSP(somarDias(d.inscricaoFim, 1), 15),
      );
      naListaDeEspera = sc.id;
      continue;
    }
    if (tipo === 'em-analise') {
      await criarInscricao(
        ANO_ATUAL,
        u,
        { applicationStatus: S.UnderReview },
        inscritoEm,
      );
      continue;
    }
    if (tipo === 'indeferido') {
      const sc = await criarInscricao(
        ANO_ATUAL,
        u,
        { applicationStatus: S.Rejected },
        inscritoEm,
      );
      log(
        sc.id,
        S.Rejected,
        'Documentação incompleta',
        emSP(somarDias(d.inscricaoFim, 1), 14),
      );
      continue;
    }
    if (tipo === 'nao-declarou') {
      // 1ª chamada, prazo vencido: o cron `verifyLostEnrolled` marca no dia do limite
      const sc = await criarInscricao(
        ANO_ATUAL,
        u,
        {
          applicationStatus: S.MissedDeadline,
          ...datasDaConvocacao(primeiraChamada),
        },
        inscritoEm,
      );
      const { limitEnrolledAt } = convocar(sc.id, primeiraChamada);
      log(
        sc.id,
        S.MissedDeadline,
        'Matrícula perdida',
        emSP(limitEnrolledAt, 0, 0),
      );
      continue;
    }

    // convocado e declarou-interesse: 2ª chamada, prazo correndo
    const convocadoEm = somarDias(ctx.hoje, tipo === 'convocado' ? -2 : -3);
    const declarou = tipo === 'declarou-interesse';
    const sc = await criarInscricao(
      ANO_ATUAL,
      u,
      {
        applicationStatus: declarou
          ? S.DeclaredInterest
          : S.CalledForEnrollment,
        selectEnrolled: false,
        ...datasDaConvocacao(convocadoEm),
        ...(declarou && { ...pesquisa(), documentsDone: true }),
      },
      inscritoEm,
    );
    convocar(sc.id, convocadoEm);
    if (declarou) declarar(sc.id, ANO_ATUAL, somarDias(ctx.hoje, -1));
  }

  // lista de espera com 1 aluno: como `updateOrderWaitingList`
  if (naListaDeEspera)
    await processos.update(
      { id: ctx.processos[ANO_ATUAL] },
      { head: naListaDeEspera, tail: naListaDeEspera, lenght: 1 },
    );

  const gravados = await gravar();

  console.log(
    `05 alunos: ${ctx.alunos.length} matriculados ao longo dos anos + ${CANDIDATOS_EXTRAS.length} candidatos da 2ª chamada, ${gravados.logs} logs, ${gravados.submissions} submissions`,
  );
}
