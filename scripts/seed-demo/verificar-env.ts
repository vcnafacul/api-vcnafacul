import { parse } from 'dotenv';
import { readFileSync } from 'fs';
import { envSchema as envDaApi } from '../../src/shared/modules/env/env';
import { ARQUIVO_ENV, conferirTrava } from './ambiente';

/** Só o que interessa de um `z.object`: as chaves. */
type Esquema = { shape: Record<string, unknown> };

/**
 * Chaves do `envSchema` do vcnafacul-form
 * (`../vcnafacul-form/src/common/modules/env/env.ts`). Copiadas à mão de
 * propósito: importar o arquivo do outro repo tira o `rootDir` da api do lugar
 * (o `nest start` passa a gerar `dist/api-vcnafacul/src/main.js` e não acha
 * `dist/main`) e quebra o CI, onde o form não está ao lado. Se o form ganhar
 * chave nova, acrescentar aqui.
 */
export const envDoForm: Esquema = {
  shape: { PORT: 1, MONGODB: 1, NODE_ENV: 1, ADMIN_FORM_SECRET: 1 },
};

/** Chave com default também precisa estar no arquivo: senão o ConfigModule a busca no `.env`. */
export function chavesFaltando(
  esquemas: Esquema[],
  valores: Record<string, string>,
) {
  const chaves = esquemas.flatMap((e) => Object.keys(e.shape));
  return [...new Set(chaves)].filter((c) => !(c in valores));
}

if (require.main === module) {
  const valores = parse(readFileSync(ARQUIVO_ENV));
  conferirTrava(valores);
  const faltando = chavesFaltando([envDaApi, envDoForm], valores);
  if (faltando.length) {
    console.error(`❌ .env.seed-demo sem: ${faltando.join(', ')}`);
    console.error(
      'Sem elas a api/form leem o .env real (banco remoto). Acrescente no arquivo.',
    );
    process.exit(1);
  }
  console.log(
    '✔ .env.seed-demo cobre todas as chaves da api e do form, e é local.',
  );
}
