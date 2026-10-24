import { CalculoDosIndicadores } from '../../../src/modules/prepCourse/indicadores/calculo-dos-indicadores';
import { IndicadoresRepository } from '../../../src/modules/prepCourse/indicadores/indicadores.repository';
import { preencherFotos } from '../../../src/modules/prepCourse/indicadores/preencher-fotos';
import { Contexto } from '../contexto';

/**
 * Mesmo cálculo do cron/backfill, com a conexão do seed (o script
 * `indicadores:backfill` lê o `.env` real). Hoje fica de fora, como no
 * backfill: é do cron das 23h40.
 */
export async function executar(ctx: Contexto) {
  const r = await preencherFotos(
    new IndicadoresRepository(ctx.ds.manager),
    new CalculoDosIndicadores(ctx.ds.manager),
    {
      aplicar: true,
      sobrescrever: true,
      hoje: ctx.hoje.toISOString().slice(0, 10),
    },
  );
  console.log(
    `07 indicadores: ${r.linhas} fotos de turma em ${r.periodos} períodos`,
  );
}
