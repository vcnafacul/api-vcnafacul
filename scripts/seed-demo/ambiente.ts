import { parse } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

/** O único arquivo de ambiente do seed demo. O `.env` da api aponta para banco remoto. */
export const ARQUIVO_ENV = join(__dirname, '.env.seed-demo');

const LOCAIS = ['localhost', '127.0.0.1'];

function hostDoMongo(uri: string): string {
  if (uri.startsWith('mongodb+srv://')) return 'srv';
  try {
    return new URL(uri).hostname;
  } catch {
    // vários hosts (replica set remoto) ou URI inválida: não é local
    return 'invalido';
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
  if (!LOCAIS.includes(hostDoMongo(env.MONGODB ?? 'mongodb://ausente')))
    throw new Error('MONGODB não é local. O seed demo só roda em banco local.');
}

/** Lê o `.env.seed-demo` pelo caminho, sobrescreve o process.env e aplica a trava. */
export function carregarAmbiente(arquivo = ARQUIVO_ENV) {
  const valores = parse(readFileSync(arquivo));
  Object.assign(process.env, valores);
  conferirTrava(process.env);
  return valores;
}
