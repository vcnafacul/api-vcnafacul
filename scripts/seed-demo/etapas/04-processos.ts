import { ObjectId } from 'mongodb';
import { InscriptionCourse } from '../../../src/modules/prepCourse/InscriptionCourse/inscription-course.entity';
import { Status } from '../../../src/modules/simulado/enum/status.enum';
import {
  ANO_ATUAL,
  ANOS,
  PROCESSO_ABERTO,
  datasDoAno,
  datasDoProcessoAberto,
} from '../config';
import { Contexto } from '../contexto';
import {
  CondicoesFixture,
  FormFixture,
  PerguntaFixture,
  lerFixture,
} from '../formulario';

/**
 * Documentos no formato em que o vcnafacul-form grava (schemas com
 * `timestamps: true, versionKey: false` + `BaseSchema.deleted`). Os ids das
 * relações são ObjectId (`Form.sections`, `Section.questions`, `Rule.question`,
 * `RuleSet.form/scoringRules/tieBreakerRules`, `Submission.form`); só
 * `FormFull.globalFormId/partnerFormId/inscriptionId`, `Form.ownerId` e o
 * `questionId` das condições são string.
 */
interface PerguntaDoc {
  _id: ObjectId;
  text: string;
  helpText: string;
  answerType: string;
  collection: string;
  conditions: {
    logic: string;
    conditions: {
      questionId: string;
      operator: string;
      expectedValue: unknown;
    }[];
  } | null;
  options: string[];
  active: boolean;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SecaoGravada {
  _id: ObjectId;
  name: string;
  description: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  perguntas: PerguntaDoc[];
}

/** O formulário "existe" antes do primeiro processo (2024). */
const CRIADO_EM = new Date(Date.UTC(2023, 11, 1, 13));

/** Troca o `questionText` das condições pelo id novo da pergunta-alvo. */
function resolverCondicoes(
  c: CondicoesFixture | null,
  idDaPergunta: Map<string, ObjectId>,
  dona: string,
): PerguntaDoc['conditions'] {
  if (!c) return null;
  return {
    logic: c.logic,
    conditions: c.conditions.map((b) => {
      const id = idDaPergunta.get(b.questionText);
      if (!id)
        throw new Error(
          `Pergunta "${dona}": condição aponta para "${b.questionText}", que não existe no fixture`,
        );
      return {
        questionId: String(id),
        operator: b.operator,
        expectedValue: b.expectedValue,
      };
    }),
  };
}

/** Grava questions → sections → form, como o form grava pelos endpoints. */
async function gravarForm(
  ctx: Contexto,
  f: FormFixture,
  ownerType: 'GLOBAL' | 'PARTNER',
  ownerId: string | null,
  idDaPergunta: Map<string, ObjectId>,
) {
  const secoes: SecaoGravada[] = [];
  for (const s of f.sections) {
    const perguntas: PerguntaDoc[] = s.questions.map((q: PerguntaFixture) => ({
      _id: idDaPergunta.get(q.text)!,
      text: q.text,
      helpText: q.helpText,
      answerType: q.answerType,
      collection: q.collection,
      conditions: resolverCondicoes(q.conditions, idDaPergunta, q.text),
      options: q.options,
      active: true,
      deleted: false,
      createdAt: CRIADO_EM,
      updatedAt: CRIADO_EM,
    }));
    if (perguntas.length)
      await ctx.form.collection('questions').insertMany(perguntas);
    const secao = {
      _id: new ObjectId(),
      name: s.name,
      description: s.description,
      questions: perguntas.map((p) => p._id),
      active: true,
      deleted: false,
      createdAt: CRIADO_EM,
      updatedAt: CRIADO_EM,
    };
    await ctx.form.collection('sections').insertOne(secao);
    secoes.push({ ...secao, perguntas });
  }
  const form = {
    _id: new ObjectId(),
    name: f.name,
    sections: secoes.map((s) => s._id),
    active: true, // GLOBAL: ativado pelo admin; PARTNER: nasce ativo
    ownerType,
    ownerId,
    deleted: false,
    createdAt: CRIADO_EM,
    updatedAt: CRIADO_EM,
  };
  await ctx.form.collection('forms').insertOne(form);
  return { form, secoes };
}

/** Seção do FormFull — `form-full.mapper.ts` (`mapSection`) do vcnafacul-form. */
const secaoDoFormFull = (s: SecaoGravada, isGlobal: boolean) => ({
  _id: s._id,
  name: s.name,
  description: s.description ?? '',
  isGlobal,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
  questions: s.perguntas
    .filter((q) => !q.deleted && q.active)
    .map((q) => ({
      _id: q._id,
      text: q.text,
      helpText: q.helpText,
      answerType: q.answerType,
      collection: q.collection,
      conditions: q.conditions,
      options: q.options,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    })),
});

const secoesDoFormFull = (secoes: SecaoGravada[], isGlobal: boolean) =>
  secoes
    .filter((s) => s.active)
    .map((s) => secaoDoFormFull(s, isGlobal))
    .filter((s) => s.questions.length > 0);

export async function executar(ctx: Contexto) {
  if (!ctx.cursinhoId) throw new Error('04 processos: rode o 02 antes');
  const fx = lerFixture();
  // sem fixture do parceiro, o form cria o dele vazio na 1ª visita (lazy)
  const fxParceiro = fx.parceiro ?? {
    name: 'Formulário do Cursinho',
    sections: [],
  };

  // texto → id novo, antes de gravar (condições podem apontar para frente)
  const idDaPergunta = new Map<string, ObjectId>();
  for (const f of [fx.global, fxParceiro])
    for (const s of f.sections)
      for (const q of s.questions) {
        if (idDaPergunta.has(q.text))
          throw new Error(`Pergunta repetida no fixture: "${q.text}"`);
        idDaPergunta.set(q.text, new ObjectId());
      }

  const global = await gravarForm(ctx, fx.global, 'GLOBAL', null, idDaPergunta);
  const parceiro = await gravarForm(
    ctx,
    fxParceiro,
    'PARTNER',
    ctx.cursinhoId,
    idDaPergunta,
  );

  // Regras: uma vez, compartilhadas pelos rule-sets (como no form, regra não tem dono)
  const regras = fx.regras.map((r) => {
    const question = idDaPergunta.get(r.pergunta);
    if (!question)
      throw new Error(
        `Regra "${r.name}": pergunta "${r.pergunta}" não existe no fixture`,
      );
    return {
      _id: new ObjectId(),
      name: r.name,
      description: r.description,
      type: r.type,
      strategy: r.strategy,
      question,
      config: r.config,
      weight: r.weight,
      active: true,
      deleted: false,
      createdAt: CRIADO_EM,
      updatedAt: CRIADO_EM,
    };
  });
  if (regras.length) await ctx.form.collection('rules').insertMany(regras);

  const secoesFull = [
    ...secoesDoFormFull(global.secoes, true),
    ...secoesDoFormFull(parceiro.secoes, false),
  ];
  if (!secoesFull.length)
    throw new Error('04 processos: o fixture não tem seção com pergunta');

  const repo = ctx.ds.getRepository(InscriptionCourse);
  async function criarProcesso(
    ano: number,
    d: { inscricaoInicio: Date; inscricaoFim: Date },
    requestDocuments: boolean,
  ) {
    // A api grava as datas no horário de parede de SP (conexão sem `timezone`,
    // processo com TZ=America/Sao_Paulo); a conexão do seed é `Z`, então as
    // partes UTC daqui viram exatamente esse texto no banco. Fim sem os .999 do
    // service: em `datetime` (sem fração) o MySQL arredonda para 00:00 do dia
    // seguinte, e a tela mostraria o fim um dia depois.
    const fim = new Date(d.inscricaoFim);
    fim.setUTCHours(23, 59, 59, 0);
    // Como o cron `updateInfosInscription` deixa (roda no boot da api e a cada
    // 3h): fim no passado → Rejected (a tela mostra "Encerrado"); o 2027, com
    // inscrições abertas hoje, fica Approved ("Ativo").
    const processo = await repo.save(
      Object.assign(new InscriptionCourse(), {
        name: `Processo Seletivo ${ano}`,
        description: `Seleção de estudantes para o ano letivo ${ano} do Cursinho Popular Semear.`,
        startDate: d.inscricaoInicio,
        endDate: fim,
        actived: fim < ctx.hoje ? Status.Rejected : Status.Approved,
        expectedOpening: 45,
        requestDocuments,
        partnerPrepCourse: { id: ctx.cursinhoId },
        createdAt: d.inscricaoInicio, // a listagem ordena por createdAt DESC
        updatedAt: d.inscricaoInicio,
      }),
    );
    ctx.processos[ano] = processo.id;

    // `formFullMapper` do form: nome = do form global, ids dos forms em string
    const formFull = {
      _id: new ObjectId(),
      inscriptionId: processo.id,
      name: global.form.name,
      globalFormId: String(global.form._id),
      partnerFormId: String(parceiro.form._id),
      sections: secoesFull,
      deleted: false,
      createdAt: d.inscricaoInicio,
      updatedAt: d.inscricaoInicio,
    };
    await ctx.form.collection('formfulls').insertOne(formFull);
    ctx.formFull[ano] = formFull._id;

    // `by-inscription/:id` acha o rule-set por `form` = FormFull._id (ObjectId)
    await ctx.form.collection('rulesets').insertOne({
      _id: new ObjectId(),
      name: `Regras — Processo Seletivo ${ano}`,
      form: formFull._id,
      scoringRules: regras.filter((r) => r.type === 'Score').map((r) => r._id),
      tieBreakerRules: regras
        .filter((r) => r.type === 'TieBreaker')
        .map((r) => r._id),
      lastRanking: null,
      lastRankingAt: null,
      deleted: false,
      createdAt: d.inscricaoInicio,
      updatedAt: d.inscricaoInicio,
    });
  }

  for (const ano of ANOS)
    await criarProcesso(ano, datasDoAno(ano), ano === ANO_ATUAL);
  // inscrições abertas hoje; pede documentos como o do ano atual
  await criarProcesso(
    PROCESSO_ABERTO.ano,
    datasDoProcessoAberto(ctx.hoje),
    true,
  );
  console.log(
    `04 processos: ${ANOS.length + 1} processos (${PROCESSO_ABERTO.ano} com inscrições abertas), ${idDaPergunta.size} perguntas e ${regras.length} regras no Mongo`,
  );
}
