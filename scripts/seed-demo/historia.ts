import { StatusApplication } from '../../src/modules/prepCourse/studentCourse/enums/stastusApplication';
import { MOTIVO_DESISTENCIA_INICIAL } from '../../src/modules/prepCourse/indicadores/motivos-de-cancelamento';
import { entre, escolher, faker } from './aleatorio';
import { ANO_ATUAL, datasDoAno, FRACAO_DESISTENCIA_INICIAL } from './config';
import { maior, menor, somarDias } from './calendario';

const MOTIVOS_AO_LONGO_DO_ANO = [
  'Rotina',
  'Transporte',
  'Motivos pessoais',
  'Abandono',
  'Não informou o motivo',
] as const;

export interface Historia {
  inscritoEm: Date;
  convocadoEm: Date;
  matriculadoEm: Date;
  saida: { data: Date; motivo: string } | null;
  /** A partir de quando o aluno para de vir (gera o "sumindo" nos indicadores). */
  sumindoDesde: Date | null;
  statusFinal: StatusApplication;
}

/** Alunos ativos do ano atual que pararam de vir (a lista "sumindo" de hoje). */
export const SUMINDO_HOJE = 3;

export function planejarHistorias(
  ano: number,
  quantidade: number,
  evasao: number,
  hoje: Date,
): Historia[] {
  const d = datasDoAno(ano);
  const fimEfetivo = menor(somarDias(d.periodoFim, -21), somarDias(hoje, -7));
  const diasAteFim = Math.round(
    (fimEfetivo.getTime() - d.periodoInicio.getTime()) / 86400000,
  );
  const indices = [...Array(quantidade).keys()];
  const totalSaidas = Math.round(quantidade * evasao);
  const quemSai = faker.helpers.arrayElements(indices, totalSaidas);
  const iniciais = new Set(
    faker.helpers.arrayElements(
      quemSai,
      Math.round(totalSaidas * FRACAO_DESISTENCIA_INICIAL),
    ),
  );
  const saem = new Set(quemSai);
  const sumindoHoje = new Set(
    ano === ANO_ATUAL
      ? faker.helpers.arrayElements(
          indices.filter((i) => !saem.has(i)),
          SUMINDO_HOJE,
        )
      : [],
  );
  const encerrado = d.periodoFim < hoje;

  return indices.map((i) => {
    // Sorteia sempre o mesmo número de valores por aluno: o plano de um
    // aluno não desloca a sequência dos seguintes.
    const inscritoEm = somarDias(d.inscricaoInicio, entre(0, 40));
    const convocadoEm = somarDias(d.inscricaoFim, entre(1, 4));
    const matriculadoEm = somarDias(convocadoEm, entre(1, 5));
    const diaSaidaInicial = entre(5, 40);
    const diaSaidaNoAno = entre(45, Math.max(46, diasAteFim));
    const motivoNoAno = escolher(MOTIVOS_AO_LONGO_DO_ANO);
    // >=12 dias garante 3 chamadas seguidas em qualquer par de dias da semana.
    const diasSumido = entre(12, 18);

    let saida: Historia['saida'] = null;
    let sumindoDesde: Date | null = null;

    if (iniciais.has(i)) {
      const data = somarDias(d.periodoInicio, diaSaidaInicial);
      saida = { data, motivo: MOTIVO_DESISTENCIA_INICIAL };
      sumindoDesde = maior(d.periodoInicio, somarDias(data, -7));
    } else if (saem.has(i)) {
      const data = somarDias(d.periodoInicio, diaSaidaNoAno);
      saida = { data, motivo: motivoNoAno };
      sumindoDesde = somarDias(data, -21);
    } else if (sumindoHoje.has(i)) {
      sumindoDesde = maior(
        somarDias(matriculadoEm, 1),
        somarDias(hoje, -diasSumido),
      );
    }

    const statusFinal = saida
      ? StatusApplication.EnrollmentCancelled
      : encerrado
        ? StatusApplication.EnrollmentClosed
        : StatusApplication.Enrolled;

    return {
      inscritoEm,
      convocadoEm,
      matriculadoEm,
      saida,
      sumindoDesde,
      statusFinal,
    };
  });
}
