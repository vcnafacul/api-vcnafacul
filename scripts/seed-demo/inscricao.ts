import { ObjectId } from 'mongodb';
import { StatusApplication as S } from '../../src/modules/prepCourse/studentCourse/enums/stastusApplication';
import { LogStudent } from '../../src/modules/prepCourse/studentCourse/log-student/log-student.entity';
import { StudentCourse } from '../../src/modules/prepCourse/studentCourse/student-course.entity';
import { SocioeconomicAnswer } from '../../src/modules/prepCourse/studentCourse/types/student-course-full';
import { Role } from '../../src/modules/role/role.entity';
import { Gender } from '../../src/modules/user/enum/gender';
import { User } from '../../src/modules/user/user.entity';
import { entre, escolher, faker } from './aleatorio';
import { inicioDoDia } from './calendario';
import { DOMINIO_DEMO } from './config';
import { Contexto } from './contexto';
import { lerFixture } from './formulario';
import { montarResposta } from './respostas';

// Inscrição de um estudante como a api grava (user + student_course + log
// "Inscrição realizada" + submission no form). Usado pelo 05 (anos com
// história) e pelo 08 (processo com inscrições abertas).

/**
 * Hora do relógio de São Paulo, para coluna `timestamp` do MySQL
 * (`log_student.created_at`, `student_course.created_at`, `users.created_at`).
 *
 * A api lê essas colunas com o fuso do processo (TypeORM sem `timezone`,
 * TZ=America/Sao_Paulo): o texto no banco **é** a hora de SP que a tela
 * mostra, e o `fimDoDia` dos indicadores também vira texto de SP. A conexão do
 * seed é `Z` (grava as partes UTC como texto), então a hora de SP vai nas
 * partes UTC. Qualquer hora (0–23) cai no dia certo para a api — por isso o
 * 07 calcula com uma conexão igual à da api (`conexaoComoAApi`).
 */
export const emSP = (dia: Date, hora: number, minuto = 0) =>
  new Date(
    Date.UTC(
      dia.getUTCFullYear(),
      dia.getUTCMonth(),
      dia.getUTCDate(),
      hora,
      minuto,
    ),
  );

/** Instante real de um `emSP` (SP é -03:00 o ano todo desde 2019): para o Mongo, que guarda instantes. */
export const instanteDe = (horaDeSP: Date) =>
  new Date(horaDeSP.getTime() + 3 * 60 * 60 * 1000);

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
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

/**
 * Junta logs e submissions em memória (gravados em lote no `gravar`).
 * `emailsJaUsados`: e-mails do demo que já estão no banco (o 08 roda depois
 * do 05 e não pode repetir nenhum).
 */
export async function criarInscritor(
  ctx: Contexto,
  emailsJaUsados: Iterable<string> = [],
) {
  if (!ctx.cursinhoId) throw new Error('inscrição: rode o 02 antes');
  const fx = lerFixture();
  const roleAluno = await ctx.ds
    .getRepository(Role)
    .findOneByOrFail({ name: 'aluno' });
  const users = ctx.ds.getRepository(User);
  const alunos = ctx.ds.getRepository(StudentCourse);

  const logs: Partial<LogStudent>[] = [];
  const submissions: Record<string, unknown>[] = [];
  const emails = new Set<string>(emailsJaUsados);

  // texto da pergunta → _id, do FormFull de cada ano (a submission aponta
  // para as perguntas do FormFull do processo dela)
  const perguntasDoAno = new Map<number, Map<string, ObjectId>>();
  async function perguntas(ano: number) {
    const pronta = perguntasDoAno.get(ano);
    if (pronta) return pronta;
    const ff = await ctx.form
      .collection('formfulls')
      .findOne({ _id: ctx.formFull[ano] });
    if (!ff) throw new Error(`inscrição: FormFull de ${ano} não existe`);
    const m = new Map<string, ObjectId>();
    for (const s of ff.sections)
      for (const q of s.questions) m.set(q.text, q._id as ObjectId);
    perguntasDoAno.set(ano, m);
    return m;
  }

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
    const doFormFull = await perguntas(ano);
    const resposta = montarResposta(fx);
    const answers: SocioeconomicAnswer[] = Object.entries(resposta).map(
      ([question, answer]) => {
        const id = doFormFull.get(question);
        if (!id)
          throw new Error(
            `inscrição: resposta para "${question}", que não está no FormFull de ${ano}`,
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
      createdAt: instanteDe(inscritoEm),
      updatedAt: instanteDe(inscritoEm),
    });
    return sc;
  }

  /** Grava em lote os logs e as submissions juntados até aqui. */
  async function gravar() {
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
    return { logs: logs.length, submissions: submissions.length };
  }

  return { log, criarPessoa, criarInscricao, gravar };
}
