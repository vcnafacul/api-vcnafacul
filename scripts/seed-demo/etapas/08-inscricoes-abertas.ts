import { Like } from 'typeorm';
import { InscriptionCourse } from '../../../src/modules/prepCourse/InscriptionCourse/inscription-course.entity';
import { StatusApplication as S } from '../../../src/modules/prepCourse/studentCourse/enums/stastusApplication';
import { StudentCourse } from '../../../src/modules/prepCourse/studentCourse/student-course.entity';
import { User } from '../../../src/modules/user/user.entity';
import { entre } from '../aleatorio';
import { menor, somarDias } from '../calendario';
import {
  DOMINIO_DEMO,
  PROCESSO_ABERTO,
  datasDoProcessoAberto,
} from '../config';
import { Contexto } from '../contexto';
import { criarInscritor, emSP } from '../inscricao';

type Situacao =
  | 'em-analise'
  | 'enviado-documento'
  | 'indeferido'
  | 'lista-de-espera';

/**
 * Situação de cada inscrito, na ordem de inscrição (o mais antigo primeiro):
 * quem se inscreveu antes já foi mexido pela coordenação; os mais recentes
 * seguem "Em Análise".
 *
 * Sem "Convocado"/"Declarou Interesse": a api não bloqueia convocar com o
 * processo aberto, mas a convocação é o resultado da seleção (em 2024–2026
 * todas são depois do fim das inscrições) — então o processo aberto usa a
 * lista de espera, que a api aceita para quem está "Em Análise".
 *
 * "Enviado Documento": a api não grava mais esse status desde fev/2025 (o
 * envio de documentos hoje só existe para convocados e loga "Enviou
 * documentos" como "Convocado para matrícula"); a tela ainda o mostra (ícone
 * e cor próprios). Aqui ele vem com o log que o `submitDocuments` gravava
 * antes de mudar (`SendedDocument` / "Documento enviado"), sem arquivo em
 * `document_student`.
 */
const SITUACOES: Situacao[] = [
  'enviado-documento',
  'indeferido',
  'lista-de-espera',
  'em-analise',
  'enviado-documento',
  'lista-de-espera',
  'em-analise',
  'em-analise',
  'em-analise',
];

/** Motivo do indeferimento (texto livre do modal, como o "Documentação incompleta" de 2026). */
const MOTIVO_INDEFERIMENTO = 'Não mora na região atendida pelo cursinho';

/**
 * Inscritos do processo com inscrições abertas (tickets/053, Q5): sem turma,
 * período nem número de matrícula —, com o log "Inscrição realizada", o
 * socioeconômico e a submission no FormFull do processo; parte já passou pela
 * coordenação (ver `SITUACOES`).
 *
 * Etapa à parte e por último de propósito: o faker é uma sequência só, e
 * sortear estes nomes antes da 05/06 mudaria os alunos e a frequência de
 * 2024–2026. Aqui eles só consomem o que sobra depois de tudo.
 */
export async function executar(ctx: Contexto) {
  const { ano, inscritos } = PROCESSO_ABERTO;
  if (!ctx.processos[ano])
    throw new Error(`08 inscrições abertas: rode o 04 antes (sem ${ano})`);
  if (SITUACOES.length !== inscritos)
    throw new Error(
      `08 inscrições abertas: ${SITUACOES.length} situações para ${inscritos} inscritos`,
    );

  // o 05 já usou e-mails do demo; os daqui não podem repetir nenhum
  const jaUsados = await ctx.ds.getRepository(User).find({
    select: { email: true },
    where: { email: Like(`%@${DOMINIO_DEMO}`) },
  });
  const { log, criarPessoa, criarInscricao, gravar } = await criarInscritor(
    ctx,
    jaUsados.map((u) => u.email),
  );

  // inscritos entre o início do processo e ontem, em horário do dia (SP)
  const { inscricaoInicio } = datasDoProcessoAberto(ctx.hoje);
  const diasAteOntem = PROCESSO_ABERTO.diasDesdeInicio - 1;
  const ontem = somarDias(ctx.hoje, -1);
  const datas = Array.from({ length: inscritos }, () =>
    emSP(
      somarDias(inscricaoInicio, entre(0, diasAteOntem)),
      entre(8, 20),
      entre(0, 59),
    ),
  ).sort((a, b) => a.getTime() - b.getTime());

  /** Quando a coordenação (ou o aluno) agiu: 1–3 dias depois da inscrição, até ontem. */
  function depoisDe(inscritoEm: Date) {
    const dia = menor(somarDias(inscritoEm, entre(1, 3)), ontem);
    const quando = emSP(dia, entre(9, 17), entre(0, 59));
    // inscrito ontem: a ação fica no mesmo dia, depois da inscrição
    return quando > inscritoEm
      ? quando
      : new Date(inscritoEm.getTime() + 2 * 60 * 60 * 1000);
  }

  const naListaDeEspera: string[] = [];
  for (const [i, inscritoEm] of datas.entries()) {
    const situacao = SITUACOES[i];
    const u = await criarPessoa(ano, inscritoEm);
    const extra: Partial<StudentCourse> = {
      'em-analise': { applicationStatus: S.UnderReview },
      'enviado-documento': {
        applicationStatus: S.SendedDocument,
        documentsDone: true,
      },
      indeferido: { applicationStatus: S.Rejected },
      'lista-de-espera': {
        applicationStatus: S.UnderReview,
        waitingList: true,
        selectEnrolled: false,
      },
    }[situacao];
    const sc = await criarInscricao(ano, u, extra, inscritoEm);
    if (situacao === 'em-analise') continue;

    const quando = depoisDe(inscritoEm);
    if (situacao === 'enviado-documento')
      log(sc.id, S.SendedDocument, 'Documento enviado', quando);
    else if (situacao === 'indeferido')
      // `rejectStudent`: o motivo do modal vira a descrição
      log(sc.id, S.Rejected, MOTIVO_INDEFERIMENTO, quando);
    else {
      // `updateWaitingList`: o log fica "Em Análise"
      log(
        sc.id,
        S.UnderReview,
        'Adicionou estudante na lista de espera',
        quando,
      );
      naListaDeEspera.push(sc.id);
    }
  }

  // lista de espera encadeada como o `addList` deixa (na ordem em que entraram)
  const alunos = ctx.ds.getRepository(StudentCourse);
  for (const [i, id] of naListaDeEspera.entries())
    await alunos.update(
      { id },
      {
        prev: naListaDeEspera[i - 1] ?? null,
        next: naListaDeEspera[i + 1] ?? null,
      },
    );
  if (naListaDeEspera.length)
    await ctx.ds.getRepository(InscriptionCourse).update(
      { id: ctx.processos[ano] },
      {
        head: naListaDeEspera[0],
        tail: naListaDeEspera[naListaDeEspera.length - 1],
        lenght: naListaDeEspera.length,
      },
    );

  const gravados = await gravar();
  const contagem = SITUACOES.reduce<Record<string, number>>(
    (acc, s) => ({ ...acc, [s]: (acc[s] ?? 0) + 1 }),
    {},
  );
  console.log(
    `08 inscrições abertas: ${inscritos} inscritos no processo de ${ano} (${Object.entries(
      contagem,
    )
      .map(([s, n]) => `${n} ${s}`)
      .join(
        ', ',
      )}), ${gravados.logs} logs, ${gravados.submissions} submissions`,
  );
}
