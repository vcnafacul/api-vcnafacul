import { CalculoDosIndicadores } from '../../../src/modules/prepCourse/indicadores/calculo-dos-indicadores';
import { IndicadoresRepository } from '../../../src/modules/prepCourse/indicadores/indicadores.repository';
import { preencherFotos } from '../../../src/modules/prepCourse/indicadores/preencher-fotos';
import { abrirConexaoComoAApi } from '../conexoes';
import { Contexto } from '../contexto';

/**
 * Mesmo cálculo do cron/backfill (o script `indicadores:backfill` lê o `.env`
 * real), com uma conexão **igual à da api** — em produção o cron roda dentro
 * dela, e é com ela que o dia de um log das 00:00 de SP cai no dia certo.
 * Hoje fica de fora, como no backfill: é do cron das 23h40.
 */
export async function executar(ctx: Contexto) {
  const ds = await abrirConexaoComoAApi();
  try {
    const r = await preencherFotos(
      new IndicadoresRepository(ds.manager),
      new CalculoDosIndicadores(ds.manager),
      {
        aplicar: true,
        sobrescrever: true,
        hoje: ctx.hoje.toISOString().slice(0, 10),
      },
    );
    console.log(
      `07 indicadores: ${r.linhas} fotos de turma em ${r.periodos} períodos`,
    );
  } finally {
    await ds.destroy();
  }
}
