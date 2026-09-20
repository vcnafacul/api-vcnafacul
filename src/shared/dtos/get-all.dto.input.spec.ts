import { ValidationPipe } from '@nestjs/common';
import { GetAllStudentDtoInput } from 'src/modules/prepCourse/studentCourse/dtos/get-all-student.dto.input';
import { GetAllDtoInput, LIMITE_MAXIMO } from './get-all.dto.input';

// ⚠️ O teste passa pelo `ValidationPipe` de propósito, com as MESMAS opções do
// `main.ts`. Instanciar a classe com `new` não prova NADA: nesse caminho o
// `@Type` do class-transformer nunca roda, e é justamente ele que converte.
const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: false,
});

const parse = (
  query: Record<string, unknown>,
  metatype: any = GetAllDtoInput,
) => pipe.transform(query, { type: 'query', metatype, data: undefined });

const esperaRecusa = async (query: Record<string, unknown>) => {
  await expect(parse(query)).rejects.toMatchObject({ status: 400 });
};

describe('GetAllDtoInput — defaults', () => {
  it('sem page e sem limit usa os defaults, como NUMBER', async () => {
    const out = await parse({});
    expect(out.page).toBe(1);
    expect(out.limit).toBe(100);
    expect(typeof out.page).toBe('number');
    expect(typeof out.limit).toBe('number');
  });

  it('⚠️ page: undefined EXPLÍCITO perde o default', async () => {
    // Sentinela, não aprovação: o class-transformer não aplica o
    // inicializador quando a chave existe no objeto de origem. Querystring
    // nunca produz isto (entrega string vazia), mas se algum dia um chamador
    // interno passar `undefined` na mão, este teste explica o sintoma.
    const out = await parse({ page: undefined });
    expect(out.page).toBeUndefined();
  });
});

describe('GetAllDtoInput — page', () => {
  it('page="2" vira o NÚMERO 2', async () => {
    const out = await parse({ page: '2' });
    expect(out.page).toBe(2);
    // ⚠️ o typeof é o ponto do teste: antes disto o valor seguia string e só
    // funcionava por coerção aritmética (`("2" - 1) * "10"` === 10).
    expect(typeof out.page).toBe('number');
  });

  it('page="007" vira 7', async () => {
    expect((await parse({ page: '007' })).page).toBe(7);
  });

  // ⚠️ Cada um destes produzia um 500 ANTES: `page` string vira `skip`
  // negativo (`ER_PARSE_ERROR` no MySQL) ou NaN (`TypeORMError`).
  it.each([
    ['vazio — só ?page=', ''],
    ['zero', '0'],
    ['negativo', '-5'],
  ])('page %s é recusado com 400', async (_nome, valor) => {
    await esperaRecusa({ page: valor });
  });

  it('page não-numérico é recusado com 400', async () => {
    await esperaRecusa({ page: 'abc' });
  });

  it('page fracionário é recusado com 400', async () => {
    await esperaRecusa({ page: '1.5' });
  });

  it('page como objeto (operador de Mongo) é recusado com 400', async () => {
    await esperaRecusa({ page: { $ne: null } });
  });

  it('page como array é recusado com 400', async () => {
    await esperaRecusa({ page: ['1', '2'] });
  });
});

describe('GetAllDtoInput — limit', () => {
  it('limit="10" vira o NÚMERO 10', async () => {
    const out = await parse({ limit: '10' });
    expect(out.limit).toBe(10);
    expect(typeof out.limit).toBe('number');
  });

  it('⚠️ limit no teto (1000) PASSA — é o que o mapa da Home pede hoje', async () => {
    // `getGeolocation` pede limit=1000 para plotar todos os pontos do mapa em
    // página pública. Baixar o teto tiraria pontos do mapa EM SILÊNCIO.
    const out = await parse({ limit: String(LIMITE_MAXIMO) });
    expect(out.limit).toBe(1000);
    expect(LIMITE_MAXIMO).toBe(1000);
  });

  it('limit um acima do teto é recusado com 400', async () => {
    await esperaRecusa({ limit: String(LIMITE_MAXIMO + 1) });
  });

  it('⚠️ limit absurdo é recusado — era dump da tabela inteira', async () => {
    await esperaRecusa({ limit: '999999' });
  });

  it('limit zero é recusado com 400', async () => {
    await esperaRecusa({ limit: '0' });
  });
});

describe('GetAllDtoInput — as 9 subclasses herdam', () => {
  // ⚠️ `partnerPrepCourse` é obrigatório (`@IsString`) na subclasse. Sem ele o
  // pipe devolve 400 por OUTRO motivo, e o teste de recusa passaria mesmo com
  // o `page` sem validador nenhum — decorativo. Ele vai preenchido de
  // propósito, para que o único motivo possível de 400 aqui seja o `page`.
  const base = { partnerPrepCourse: 'qualquer-cursinho' };

  it('uma subclasse real recusa page inválido', async () => {
    await expect(
      parse({ ...base, page: '0' }, GetAllStudentDtoInput),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('uma subclasse real coage page para número', async () => {
    const out = await parse({ ...base, page: '3' }, GetAllStudentDtoInput);
    expect(out.page).toBe(3);
    expect(typeof out.page).toBe('number');
  });
});
