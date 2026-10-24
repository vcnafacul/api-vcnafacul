import { StatusApplication } from '../../src/modules/prepCourse/studentCourse/enums/stastusApplication';
import { MOTIVO_DESISTENCIA_INICIAL } from '../../src/modules/prepCourse/indicadores/motivos-de-cancelamento';
import { chance, entre, escolher, faker } from './aleatorio';
import { datasDoAno, FRACAO_DESISTENCIA_INICIAL } from './config';
import { menor, somarDias } from './calendario';

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

export function planejarHistorias(
  ano: number,
  quantidade: number,
  evasao: number,
  hoje: Date,
): Historia[] {
  const d = datasDoAno(ano);
  const fimEfetivo = menor(somarDias(d.periodoFim, -21), somarDias(hoje, -7));
  const totalSaidas = Math.round(quantidade * evasao);
  const quemSai = new Set(
    faker.helpers.arrayElements([...Array(quantidade).keys()], totalSaidas),
  );
  const encerrado = d.periodoFim < hoje;

  return [...Array(quantidade).keys()].map((i) => {
    const inscritoEm = somarDias(d.inscricaoInicio, entre(0, 40));
    const convocadoEm = somarDias(d.inscricaoFim, entre(1, 4));
    const matriculadoEm = somarDias(convocadoEm, entre(1, 5));
    let saida: Historia['saida'] = null;
    let sumindoDesde: Date | null = null;

    if (quemSai.has(i)) {
      if (chance(FRACAO_DESISTENCIA_INICIAL)) {
        saida = {
          data: somarDias(d.periodoInicio, entre(5, 40)),
          motivo: MOTIVO_DESISTENCIA_INICIAL,
        };
      } else {
        const dias = Math.round(
          (fimEfetivo.getTime() - d.periodoInicio.getTime()) / 86400000,
        );
        const data = somarDias(d.periodoInicio, entre(45, Math.max(46, dias)));
        saida = { data, motivo: escolher(MOTIVOS_AO_LONGO_DO_ANO) };
        sumindoDesde = somarDias(data, -21);
      }
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
