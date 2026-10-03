import { CalculoDosIndicadores } from './calculo-dos-indicadores';
import { diaDoPeriodo, diaEmSaoPaulo, diasEntre } from './datas';
import { IndicadoresRepository } from './indicadores.repository';
import { VERSAO_DAS_METRICAS } from './metricas';

export interface OpcoesDoPreenchimento {
  /** Só este período (senão, todos). */
  periodoId?: string;
  /** Regrava os dias que já têm foto (para preencher chaves novas). */
  sobrescrever?: boolean;
  /** Sem isto, só conta o que seria gravado. */
  aplicar?: boolean;
  /** Para teste; padrão = hoje em São Paulo. */
  hoje?: string;
}

/**
 * Backfill do snapshot (tickets/033, card 03): grava a foto de cada dia já
 * passado dos períodos, pela mesma conta do cron. Funciona porque a conta é
 * pela data dos eventos — o dia 10/05 calculado hoje dá o mesmo que daria em
 * 10/05.
 *
 * Hoje fica de fora: é do cron das 23h40.
 */
export async function preencherFotos(
  repository: IndicadoresRepository,
  calculo: CalculoDosIndicadores,
  opcoes: OpcoesDoPreenchimento = {},
) {
  const hoje = opcoes.hoje ?? diaEmSaoPaulo();
  const periodos = (
    await repository.periodosQueCobrem(
      new Date('2000-01-01T00:00:00Z'),
      new Date('2100-01-01T00:00:00Z'),
    )
  ).filter((p) => !opcoes.periodoId || p.id === opcoes.periodoId);

  const resumo = { periodos: 0, linhas: 0 };
  for (const periodo of periodos) {
    const inicio = diaDoPeriodo(periodo.startDate);
    const fim = diaDoPeriodo(periodo.endDate);
    const dias = diasEntre(inicio, fim < hoje ? fim : hoje).filter(
      (d) => d < hoje,
    );
    const turmas = await repository.turmasDoPeriodo(periodo.id);
    if (dias.length === 0 || turmas.length === 0) continue;
    resumo.periodos++;

    const gravados = new Map<string, Set<string>>();
    if (!opcoes.sobrescrever) {
      for (const t of turmas) {
        gravados.set(
          t.id,
          await repository.diasGravados(t.id, dias[0], dias[dias.length - 1]),
        );
      }
    }

    for (const dia of dias) {
      const faltam = turmas.filter((t) => !gravados.get(t.id)?.has(dia));
      if (faltam.length === 0) continue;
      resumo.linhas += faltam.length;
      if (!opcoes.aplicar) continue;
      const metricas = await calculo.calcular(
        faltam.map((t) => t.id),
        dia,
      );
      await repository.gravar(
        faltam.map((t) => ({
          dia,
          partnerPrepCourseId: periodo.partnerPrepCourseId,
          coursePeriodId: periodo.id,
          classId: t.id,
          metricas: metricas.get(t.id) ?? {},
          versao: VERSAO_DAS_METRICAS,
        })),
      );
    }
  }
  return resumo;
}
