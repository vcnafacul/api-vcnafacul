import { ObjectId } from 'mongodb';
import { InscriptionCourse } from '../../../src/modules/prepCourse/InscriptionCourse/inscription-course.entity';
import { StatusApplication as S } from '../../../src/modules/prepCourse/studentCourse/enums/stastusApplication';
import { LogStudent } from '../../../src/modules/prepCourse/studentCourse/log-student/log-student.entity';
import { StudentCourse } from '../../../src/modules/prepCourse/studentCourse/student-course.entity';
import { SocioeconomicAnswer } from '../../../src/modules/prepCourse/studentCourse/types/student-course-full';
import { Role } from '../../../src/modules/role/role.entity';
import { Gender } from '../../../src/modules/user/enum/gender';
import { User } from '../../../src/modules/user/user.entity';
import { entre, escolher, faker } from '../aleatorio';
import { inicioDoDia, somarDias } from '../calendario';
import {
  ALUNOS_POR_TURMA,
  ANO_ATUAL,
  ANOS,
  DOMINIO_DEMO,
  EVASAO,
  datasDoAno,
} from '../config';
import { Contexto } from '../contexto';
import { lerFixture } from '../formulario';
import { planejarHistorias } from '../historia';
import { montarResposta } from '../respostas';

/**
 * Datas, em dois formatos (ver 04 e 06):
 * - `log_student.created_at` / `student_course.created_at` (timestamp) são
 *   instantes: gravados em hora do dia de São Paulo (`emSP`), longe da
 *   meia-noite, para o dia ser o mesmo lido com fuso `Z` (seed, 07) ou com o
 *   fuso do processo da api (SP).
 * - `selectEnrolledAt` / `limitEnrolledAt` (datetime) são horário de parede
 *   de SP: o `scheduleEnrolled` grava `setHours(0,0,0,0)` com TZ=SP, e a
 *   conexão `Z` do seed grava as partes UTC como o texto — então
 *   `meiaNoiteSP(dia)` = meia-noite UTC do dia.
 */
/** `hora` de SP até 20h: o texto gravado (hora + 3) fica no mesmo dia. */
const emSP = (dia: Date, hora: number, minuto = 0) =>
  new Date(
    Date.UTC(
      dia.getUTCFullYear(),
      dia.getUTCMonth(),
      dia.getUTCDate(),
      hora + 3,
      minuto,
    ),
  );
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

/** CPF com dígitos verificadores válidos (só números, como a inscrição grava). */
function gerarCpf() {
  const n = Array.from({ length: 9 }, () => entre(0, 9));
  for (const tam of [9, 10]) {
    const soma = n
      .slice(0, tam)
      .reduce((acc, d, i) => acc + d * (tam + 1 - i), 0);
    const resto = (soma * 10) % 11;
    n.push(resto === 10 ? 0 : resto);
  }
  return n.join('');
}

const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

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
  const fx = lerFixture();
  const roleAluno = await ctx.ds
    .getRepository(Role)
    .findOneByOrFail({ name: 'aluno' });
  const users = ctx.ds.getRepository(User);
  const alunos = ctx.ds.getRepository(StudentCourse);
  const processos = ctx.ds.getRepository(InscriptionCourse);
  const nomesDasTurmas = new Map(ctx.turmas.map((t) => [t.id, t.nome]));

  // texto da pergunta → _id, do FormFull de cada ano (a submission aponta
  // para as perguntas do FormFull do processo dela)
  const perguntasDoAno = new Map<number, Map<string, ObjectId>>();
  for (const ano of ANOS) {
    const ff = await ctx.form
      .collection('formfulls')
      .findOne({ _id: ctx.formFull[ano] });
    if (!ff) throw new Error(`05 alunos: FormFull de ${ano} não existe`);
    const m = new Map<string, ObjectId>();
    for (const s of ff.sections)
      for (const q of s.questions) m.set(q.text, q._id as ObjectId);
    perguntasDoAno.set(ano, m);
  }

  const logs: Partial<LogStudent>[] = [];
  const submissions: Record<string, unknown>[] = [];
  const emails = new Set<string>();

  const log = (
    studentId: string,
    applicationStatus: S,
    description: string,
    quando: Date,
  ) =>
    logs.push({
      studentId,
      applicationStatus,
      description,
      createdAt: quando,
      updatedAt: quando,
    });

  /** E-mail único e determinístico: nome.sobrenome, depois nome.sobrenome2, 3… */
  function emailUnico(firstName: string, lastName: string) {
    const base = `${semAcento(firstName)}.${semAcento(lastName.split(' ')[0])}`;
    let email = `${base}@${DOMINIO_DEMO}`;
    for (let n = 2; emails.has(email); n++)
      email = `${base}${n}@${DOMINIO_DEMO}`;
    emails.add(email);
    return email;
  }

  async function criarPessoa(ano: number, criadoEm: Date) {
    const sexo = faker.person.sexType();
    const firstName = faker.person.firstName(sexo);
    const lastName = `${faker.person.lastName()} ${faker.person.lastName()}`;
    // maiores de idade na inscrição (janeiro): sem responsável legal
    const nascimento = faker.date.birthdate({
      min: ano - 30,
      max: ano - 19,
      mode: 'year',
    });
    const u = Object.assign(new User(), {
      email: emailUnico(firstName, lastName),
      password: null, // não loga: só o representante entra no demo
      firstName,
      lastName,
      phone: `119${faker.string.numeric(8)}`,
      gender: sexo === 'female' ? Gender.Female : Gender.Male,
      birthday: inicioDoDia(nascimento),
      postalCode: `0${entre(5000, 5599)}-${faker.string.numeric(3)}`,
      street: faker.location.street(),
      number: entre(10, 2000),
      neighborhood: escolher([
        'Butantã',
        'Rio Pequeno',
        'Jaguaré',
        'Vila Sônia',
        'Raposo Tavares',
        'Jardim Bonfiglioli',
        'Caxingui',
      ]),
      state: 'SP',
      city: 'São Paulo',
      lgpd: true,
      emailConfirmSended: null,
      role: roleAluno,
      createdAt: criadoEm,
      updatedAt: criadoEm,
    });
    return users.save(u);
  }

  /** student_course + log "Inscrição realizada" + submission, como o `create` da api. */
  async function criarInscricao(
    ano: number,
    u: User,
    extra: Partial<StudentCourse>,
    inscritoEm: Date,
  ) {
    const perguntas = perguntasDoAno.get(ano)!;
    const resposta = montarResposta(fx);
    const answers: SocioeconomicAnswer[] = Object.entries(resposta).map(
      ([question, answer]) => {
        const id = perguntas.get(question);
        if (!id)
          throw new Error(
            `05 alunos: resposta para "${question}", que não está no FormFull de ${ano}`,
          );
        return {
          questionId: String(id),
          question,
          answer: answer as SocioeconomicAnswer['answer'],
        };
      },
    );
    const sc = await alunos.save(
      Object.assign(new StudentCourse(), {
        userId: u.id,
        rg: faker.string.numeric(9),
        uf: 'SP',
        cpf: gerarCpf(),
        email: u.email,
        whatsapp: u.phone,
        urgencyPhone: `119${faker.string.numeric(8)}`,
        partnerPrepCourse: { id: ctx.cursinhoId },
        inscriptionCourse: { id: ctx.processos[ano] },
        socioeconomic: JSON.stringify(answers),
        isFree: true,
        createdAt: inscritoEm,
        updatedAt: inscritoEm,
        ...extra,
      }),
    );
    log(sc.id, S.UnderReview, 'Inscrição realizada', inscritoEm);
    // `SubmissionSevice.create`: o DTO vira o doc (inscriptionId cai no strict),
    // `form` = FormFull._id, `questionId` vira ObjectId e cada resposta ganha _id
    submissions.push({
      _id: new ObjectId(),
      form: ctx.formFull[ano],
      userId: u.id,
      studentId: sc.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      birthday: u.birthday,
      answers: answers.map((a) => ({
        _id: new ObjectId(),
        questionId: new ObjectId(a.questionId),
        answer: a.answer,
        question: a.question,
      })),
      deleted: false,
      createdAt: inscritoEm,
      updatedAt: inscritoEm,
    });
    return sc;
  }

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

  for (let i = 0; i < logs.length; i += 500)
    await ctx.ds
      .createQueryBuilder()
      .insert()
      .into(LogStudent)
      .values(logs.slice(i, i + 500) as never)
      .updateEntity(false)
      .execute();
  if (submissions.length)
    await ctx.form.collection('submissions').insertMany(submissions);

  console.log(
    `05 alunos: ${ctx.alunos.length} matriculados ao longo dos anos + ${CANDIDATOS_EXTRAS.length} candidatos da 2ª chamada, ${logs.length} logs, ${submissions.length} submissions`,
  );
}
