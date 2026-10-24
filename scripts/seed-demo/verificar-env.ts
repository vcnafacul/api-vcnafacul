import { parse } from 'dotenv';
import { readFileSync } from 'fs';
import { envSchema as envDaApi } from '../../src/shared/modules/env/env';
import { envSchema as envDoForm } from '../../../vcnafacul-form/src/common/modules/env/env';
import { ARQUIVO_ENV, conferirTrava } from './ambiente';

/**
 * Só o que interessa de um `z.object`: as chaves. Tipo estrutural de propósito —
 * a api usa zod 3 e o form zod 4, e os tipos das duas versões não se misturam.
 */
type Esquema = { shape: Record<string, unknown> };

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
