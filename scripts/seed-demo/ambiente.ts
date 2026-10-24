import { parse } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

/** O único arquivo de ambiente do seed demo. O `.env` da api aponta para banco remoto. */
export const ARQUIVO_ENV = join(__dirname, '.env.seed-demo');

const LOCAIS = ['localhost', '127.0.0.1'];

/** Os bancos dedicados do demo (docker-compose.seed-demo.yml). Nada além deles. */
export const BANCO_DEMO = {
  mysqlDb: 'vcnafacul_demo',
  mysqlPorta: '3308',
  mongoDb: 'form_demo',
  mongoPorta: '27018',
};

function partesDoMongo(uri: string) {
  if (uri.startsWith('mongodb+srv://'))
    return { host: 'srv', porta: '', banco: '' };
  try {
    const u = new URL(uri);
    return {
      host: u.hostname,
      porta: u.port,
      banco: decodeURIComponent(u.pathname.replace(/^\//, '')),
    };
  } catch {
    // vários hosts (replica set remoto) ou URI inválida: não é local
    return { host: 'invalido', porta: '', banco: '' };
  }
}

export function conferirTrava(env: Record<string, string | undefined>) {
  if (env.SEED_DEMO !== '1')
    throw new Error(
      'SEED_DEMO=1 ausente: o env carregado não é o do seed demo.',
    );
  if (!LOCAIS.includes(env.MY_HOST ?? ''))
    throw new Error(
      `MY_HOST=${env.MY_HOST} não é local. O seed demo só roda em banco local.`,
    );
  if (env.MY_PORT !== BANCO_DEMO.mysqlPorta)
    throw new Error(
      `MY_PORT=${env.MY_PORT} não é a do MySQL do demo (${BANCO_DEMO.mysqlPorta}).`,
    );
  if (env.MY_DB_NAME !== BANCO_DEMO.mysqlDb)
    throw new Error(
      `MY_DB_NAME=${env.MY_DB_NAME} não é o banco do demo (${BANCO_DEMO.mysqlDb}).`,
    );
  const mongo = partesDoMongo(env.MONGODB ?? 'mongodb://ausente');
  if (!LOCAIS.includes(mongo.host))
    throw new Error('MONGODB não é local. O seed demo só roda em banco local.');
  if (mongo.porta !== BANCO_DEMO.mongoPorta)
    throw new Error(
      `MONGODB na porta "${mongo.porta}": o Mongo do demo é a ${BANCO_DEMO.mongoPorta}.`,
    );
  if (mongo.banco !== BANCO_DEMO.mongoDb)
    throw new Error(
      `MONGODB no banco "${mongo.banco}": o banco do demo é ${BANCO_DEMO.mongoDb}.`,
    );
}

/** Lê o `.env.seed-demo` pelo caminho, sobrescreve o process.env e aplica a trava. */
export function carregarAmbiente(arquivo = ARQUIVO_ENV) {
  const valores = parse(readFileSync(arquivo));
  Object.assign(process.env, valores);
  conferirTrava(process.env);
  return valores;
}
