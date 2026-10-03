import 'dotenv/config';
import { DataSource } from 'typeorm';
import { CalculoDosIndicadores } from '../src/modules/prepCourse/indicadores/calculo-dos-indicadores';
import { IndicadoresRepository } from '../src/modules/prepCourse/indicadores/indicadores.repository';
import { preencherFotos } from '../src/modules/prepCourse/indicadores/preencher-fotos';

/**
 * Preenche as fotos diárias dos indicadores dos dias que já passaram
 * (tickets/033, card 03). Rodar depois do deploy de cada card que acrescenta
 * uma métrica, com --sobrescrever, para as linhas antigas ganharem a chave.
 *
 * Uso:
 *   yarn indicadores:backfill                         # dry-run, todos os períodos
 *   yarn indicadores:backfill --periodo <id>          # dry-run, um período
 *   yarn indicadores:backfill --apply                 # grava só os dias sem foto
 *   yarn indicadores:backfill --apply --sobrescrever  # regrava tudo
 *
 * Config: MY_HOST, MY_PORT, MY_USER, MY_PASSWORD, MY_DB_NAME (.env ou ambiente).
 */
async function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--periodo');
  const opcoes = {
    periodoId: i >= 0 ? args[i + 1] : undefined,
    aplicar: args.includes('--apply'),
    sobrescrever: args.includes('--sobrescrever'),
  };

  const ds = new DataSource({
    type: 'mysql',
    host: process.env.MY_HOST,
    port: Number(process.env.MY_PORT),
    username: process.env.MY_USER,
    password: process.env.MY_PASSWORD,
    database: process.env.MY_DB_NAME,
    entities: [__dirname + '/../src/**/*.entity.{js,ts}'],
    synchronize: false,
  });
  await ds.initialize();
  try {
    const resumo = await preencherFotos(
      new IndicadoresRepository(ds.manager),
      new CalculoDosIndicadores(ds.manager),
      opcoes,
    );
    console.log(
      `${opcoes.aplicar ? 'Gravadas' : 'Seriam gravadas'}: ${resumo.linhas} foto(s) de turma em ${resumo.periodos} período(s).`,
    );
    if (!opcoes.aplicar) console.log('Dry-run. Rode com --apply para gravar.');
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
