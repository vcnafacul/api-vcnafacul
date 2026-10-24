import 'reflect-metadata';
import { carregarAmbiente } from './ambiente';

/**
 * Seed demo (tickets/053). Carrega **só** o `.env.seed-demo` (com a trava)
 * antes de qualquer import que leia env — por isso o resto é importado
 * dinamicamente. Roda sempre tudo: o `00` zera e as etapas dependem do
 * contexto em memória. A exceção é `--so 07`, que só recalcula os indicadores.
 */
const ETAPAS = [
  '00-limpar',
  '01-pessoas',
  '02-cursinho',
  '03-periodos-turmas',
  '04-processos',
  '05-alunos',
  '06-frequencia',
  '07-indicadores',
  '08-inscricoes-abertas',
];

function etapasEscolhidas() {
  const i = process.argv.indexOf('--so');
  if (i < 0) return ETAPAS;
  const so = process.argv[i + 1];
  if (so !== '07')
    throw new Error(
      '--so só existe para 07 (as outras dependem das anteriores).',
    );
  return ETAPAS.filter((e) => e.startsWith(so));
}

async function main() {
  const escolhidas = etapasEscolhidas();
  carregarAmbiente();
  const { abrirConexoes, fecharConexoes } = await import('./conexoes');
  const { reiniciarAleatorio } = await import('./aleatorio');
  const { REPRESENTANTE } = await import('./config');
  const { diaEmSaoPaulo } = await import(
    '../../src/modules/prepCourse/indicadores/datas'
  );
  type Contexto = import('./contexto').Contexto;

  reiniciarAleatorio();
  const conexoes = await abrirConexoes();
  const ctx: Contexto = {
    ...conexoes,
    // o dia de São Paulo (como os indicadores), em meia-noite UTC
    hoje: new Date(`${diaEmSaoPaulo()}T00:00:00Z`),
    colaboradores: [],
    periodos: {},
    turmas: [],
    processos: {},
    formFull: {},
    alunos: [],
  };
  console.log(
    `Seed demo → MySQL ${process.env.MY_HOST}:${process.env.MY_PORT}/${process.env.MY_DB_NAME} · Mongo ${process.env.MONGODB}`,
  );
  try {
    for (const etapa of escolhidas) {
      const { executar } = await import(`./etapas/${etapa}`);
      await executar(ctx);
    }
    console.log(
      `\n✔ Pronto. Login: ${REPRESENTANTE.email} / SEED_DEMO_SENHA do .env.seed-demo`,
    );
    console.log(
      'Reinicie a api e o form (cache em memória) antes de abrir o site.',
    );
  } finally {
    await fecharConexoes(conexoes);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
