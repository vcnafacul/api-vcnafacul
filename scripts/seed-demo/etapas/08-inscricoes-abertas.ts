import { Like } from 'typeorm';
import { StatusApplication as S } from '../../../src/modules/prepCourse/studentCourse/enums/stastusApplication';
import { User } from '../../../src/modules/user/user.entity';
import { entre } from '../aleatorio';
import { somarDias } from '../calendario';
import {
  DOMINIO_DEMO,
  PROCESSO_ABERTO,
  datasDoProcessoAberto,
} from '../config';
import { Contexto } from '../contexto';
import { criarInscritor, emSP } from '../inscricao';

/**
 * Inscritos do processo com inscrições abertas (tickets/053, Q5): só
 * "Em Análise" — sem turma, período nem número de matrícula —, com o log
 * "Inscrição realizada", o socioeconômico e a submission no FormFull do
 * processo.
 *
 * Etapa à parte e por último de propósito: o faker é uma sequência só, e
 * sortear estes nomes antes da 05/06 mudaria os alunos e a frequência de
 * 2024–2026. Aqui eles só consomem o que sobra depois de tudo.
 */
export async function executar(ctx: Contexto) {
  const { ano, inscritos } = PROCESSO_ABERTO;
  if (!ctx.processos[ano])
    throw new Error(`08 inscrições abertas: rode o 04 antes (sem ${ano})`);

  // o 05 já usou e-mails do demo; os daqui não podem repetir nenhum
  const jaUsados = await ctx.ds.getRepository(User).find({
    select: { email: true },
    where: { email: Like(`%@${DOMINIO_DEMO}`) },
  });
  const { criarPessoa, criarInscricao, gravar } = await criarInscritor(
    ctx,
    jaUsados.map((u) => u.email),
  );

  // inscritos entre o início do processo e ontem, em horário do dia (SP)
  const { inscricaoInicio } = datasDoProcessoAberto(ctx.hoje);
  const diasAteOntem = PROCESSO_ABERTO.diasDesdeInicio - 1;
  const datas = Array.from({ length: inscritos }, () =>
    emSP(
      somarDias(inscricaoInicio, entre(0, diasAteOntem)),
      entre(8, 20),
      entre(0, 59),
    ),
  ).sort((a, b) => a.getTime() - b.getTime());

  for (const inscritoEm of datas) {
    const u = await criarPessoa(ano, inscritoEm);
    await criarInscricao(
      ano,
      u,
      { applicationStatus: S.UnderReview },
      inscritoEm,
    );
  }
  const gravados = await gravar();
  console.log(
    `08 inscrições abertas: ${inscritos} inscritos "Em Análise" no processo de ${ano}, ${gravados.logs} logs, ${gravados.submissions} submissions`,
  );
}
