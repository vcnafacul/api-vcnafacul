# `GetAllDtoInput`: validar `page` e `limit` — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer `page` e `limit` chegarem ao repositório como inteiros validados, recusando com 400 o
que hoje vira 500 ou dump de tabela.

**Architecture:** Um único arquivo de produção (`src/shared/dtos/get-all.dto.input.ts`) ganha
`@Type(() => Number)` + `@IsInt()` + `@Min(1)` nos dois campos e `@Max(1000)` no `limit`. As 9
subclasses e os ~20 controllers herdam sem tocar em nenhum deles. Os testes exercitam o
`ValidationPipe` real, porque é só na borda HTTP que o `class-transformer` roda.

**Tech Stack:** NestJS 10, class-validator, class-transformer, TypeORM, Jest.

**Spec:** `docs/superpowers/specs/2026-09-20-getalldto-validacao-page-limit-design.md`
**Branch:** `feature/16-getalldto-validacao-page-limit` (já criada, spec já commitado)

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `src/shared/dtos/get-all.dto.input.ts` | O DTO e a constante `LIMITE_MAXIMO` | Modificar |
| `src/shared/dtos/get-all.dto.input.spec.ts` | Prova o comportamento pelo `ValidationPipe` real | Criar |
| `src/shared/modules/base/base.repository.spec.ts` | Prova o elo do eco (tipo preservado no retorno) | Modificar |

---

## Task 1: O comportamento do DTO na borda HTTP

**Files:**
- Create: `src/shared/dtos/get-all.dto.input.spec.ts`
- Modify: `src/shared/dtos/get-all.dto.input.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/shared/dtos/get-all.dto.input.spec.ts` com exatamente este conteúdo:

```ts
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

const parse = (query: Record<string, unknown>, metatype: any = GetAllDtoInput) =>
  pipe.transform(query, { type: 'query', metatype, data: undefined });

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
  it('uma subclasse real recusa page inválido', async () => {
    await expect(
      parse({ page: '0' }, GetAllStudentDtoInput),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('uma subclasse real coage page para número', async () => {
    const out = await parse({ page: '3' }, GetAllStudentDtoInput);
    expect(out.page).toBe(3);
    expect(typeof out.page).toBe('number');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/shared/dtos/get-all.dto.input.spec.ts`

Expected: FALHA. O import de `LIMITE_MAXIMO` não resolve (`has no exported member
'LIMITE_MAXIMO'`), e os casos de 400 falham porque nada valida hoje.

- [ ] **Step 3: Implementar**

Substituir o conteúdo inteiro de `src/shared/dtos/get-all.dto.input.ts` por:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { GetAllInput } from '../modules/base/interfaces/get-all.input';

/**
 * Teto de itens por página.
 *
 * ⚠️ **1000, e não os 500 do `ms-simulado`** (`ms#186`). MEDIDO: `getGeolocation`
 * pede `limit=1000` numa rota LOCAL desta api (`/geo`) para plotar o mapa da
 * Home, que é página pública. O ms não tem lookup assim — lá 500 bastava.
 *
 * ⚠️ E o corte seria **silencioso**: com teto 500, um mapa de 600 pontos
 * perderia 100 sem erro, sem log, sem nada. Foi o argumento que derrubou o
 * teto menor. O maior pedido real medido no client é 1000.
 */
export const LIMITE_MAXIMO = 1000;

export class GetAllDtoInput implements GetAllInput {
  /**
   * ⚠️ Os decorators abaixo NÃO são higiene — são o conserto.
   *
   * O `main.ts` instala `ValidationPipe({ transform: true })` **sem**
   * `enableImplicitConversion`, então sem `@Type()` nada converte: o valor
   * chegava como STRING com o tipo declarado mentindo `number`.
   *
   * O caminho feliz sobrevivia por coerção aritmética do JavaScript
   * (`("2" - 1) * "10"` é `10`), e só a borda quebrava: `?page=` vazio,
   * `page=0` e `page=-5` viravam `skip` negativo, que o TypeORM emite INLINE
   * no SQL e o MySQL recusa com `ER_PARSE_ERROR` — um **500** que `?page=`
   * sozinho já disparava. `page=abc` virava `NaN` e o TypeORM lançava
   * `TypeORMError`, outro 500.
   */
  @ApiProperty({ default: 1, required: false, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  /**
   * ⚠️ A coerção para inteiro é também o que torna SEGURA a concatenação crua
   * de query em cinco serviços de proxy (`v1/frente?page=${page}&limit=${limit}`
   * em `simulado`, `subject`, `content`, `materia`, `frente`): um inteiro
   * validado não pode conter `#`, `&` nem `?`. É a mesma classe de defeito do
   * card 11, fechada aqui pela validação em vez de pela montagem da URL.
   */
  @ApiProperty({
    default: 100,
    required: false,
    minimum: 1,
    maximum: LIMITE_MAXIMO,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIMITE_MAXIMO)
  limit: number = 100;
}
```

⚠️ **Limitação conhecida e aceita, NÃO consertar:** `page=1e9` passa, porque
`Number("1e9")` é `1000000000` e `@IsInt()` o aceita. Produz `OFFSET ~1e11` —
scan caro, mas não é erro nem vazamento (devolve lista vazia). Qualquer `@Max`
no `page` seria arbitrário: o número legítimo de páginas depende da tabela e do
`limit`. Está no §6 do spec.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/shared/dtos/get-all.dto.input.spec.ts`

Expected: PASS, todos os testes do arquivo.

- [ ] **Step 5: Commit**

```bash
git add src/shared/dtos/get-all.dto.input.ts src/shared/dtos/get-all.dto.input.spec.ts
git commit -m "fix: page e limit eram string nao validada e viravam 500 ou dump de tabela"
```

---

## Task 2: O elo do eco

O `base.repository.findAllBy` devolve `{ data, page, limit, totalItems }` — o `page` e o `limit` que
recebeu, ecoados no corpo da resposta. Três services do client leem esse eco
(`getRoles`, `getPeriodJustifications`, `getAttendanceRecord`).

⚠️ O `ms-simulado` **recusou** a coerção por causa desse eco. Aqui ela foi aceita com o risco medido,
então precisa de um teste que **fixe** o formato: se alguém desfizer a Task 1, este teste não pode
ficar verde por acidente.

**Files:**
- Modify: `src/shared/modules/base/base.repository.spec.ts`

- [ ] **Step 1: Escrever o teste que falha**

Dentro do `describe('findAllBy', ...)` existente (o arquivo já monta `repo`, `mockQueryBuilder` e
`mockTypeOrmRepo` num `beforeEach`), adicionar:

```ts
    it('⚠️ ecoa page e limit no corpo PRESERVANDO o tipo que recebeu', async () => {
      // O corpo da resposta carrega estes dois campos para o client. A Task 1
      // fez o pipe entregar `number` aqui; este teste prova que o repositório
      // não os converte de volta, e portanto que o formato do corpo mudou de
      // `"limit":"10"` para `"limit":10` de propósito, e não por acidente.
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await repo.findAllBy({ page: 2, limit: 10, where: {} });

      expect(typeof result.page).toBe('number');
      expect(typeof result.limit).toBe('number');
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('⚠️ o skip nasce da aritmetica de page e limit — nunca negativo com entrada valida', async () => {
      // `.skip()` recebia `NaN` ou negativo quando `page` era string invalida,
      // e era dai que saia o 500. Com `@Min(1)` na borda, o menor skip e 0.
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      await repo.findAllBy({ page: 1, limit: 10, where: {} });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
```

- [ ] **Step 2: Rodar**

Run: `npx jest src/shared/modules/base/base.repository.spec.ts`

Expected: PASS. ⚠️ Estes dois passam já na primeira execução — o repositório sempre ecoou o que
recebeu. Eles não são TDD: são **trava de regressão** para o formato do corpo, que é o risco que a
Task 1 assumiu. Se falharem, a Task 1 quebrou algo e é preciso parar.

- [ ] **Step 3: Commit**

```bash
git add src/shared/modules/base/base.repository.spec.ts
git commit -m "test: trava o formato do corpo paginado depois da coercao"
```

---

## Task 3: A varredura de chamadores

O critério de aceite do card exige registrar quem chamava o quê. Esta task produz o texto que vai
para o corpo do PR.

**Files:** nenhum de produção. Só medição e, se algo quebrar, o reparo.

- [ ] **Step 1: Rodar a suíte unitária inteira**

Run: `npx jest src --silent 2>&1 | tail -25`

Expected: todas as suítes verdes. ⚠️ Se alguma falhar, **ler antes de consertar**: um teste que
passava `page: '1'` como string para um **service** (ex.: `content.service.spec.ts:97`) continua
válido — aquele caminho não passa pelo pipe. Só é regressão de verdade se o teste exercitar o
controller ou o pipe.

- [ ] **Step 2: Rodar os e2e**

Run: `npm run test 2>&1 | tail -30`

Expected: as mesmas falhas pré-existentes que o CLAUDE.md já registra e **nada além delas**:
- `student-course.e2e-spec.ts` — flaky: faker gera emails duplicados (`Duplicate entry`)
- `inscription-course.e2e-spec.ts` — timezone/DST: diferença de 1 dia no timestamp

⚠️ `test/prova.e2e-spec.ts` tem casos como `?page=2&limit=10` e `só ?page=3`. Eles **devem continuar
verdes**: `prova.controller` e `cursinho-prova.controller` usam `@Query('page') page?: string`
soltos, **não** o `GetAllDtoInput`, e portanto não são afetados. Se quebrarem, a mudança vazou para
onde não devia.

- [ ] **Step 3: Rodar o build e o lint**

```bash
npm run build
npx eslint src/shared/dtos/get-all.dto.input.ts src/shared/dtos/get-all.dto.input.spec.ts src/shared/modules/base/base.repository.spec.ts
```

Expected: ambos limpos.

- [ ] **Step 4: Provar que os testes discriminam (mutação)**

Aplicar uma mutação por vez em `src/shared/dtos/get-all.dto.input.ts`, rodar
`npx jest src/shared/dtos/get-all.dto.input.spec.ts`, confirmar VERMELHO, e **reverter**:

| # | Mutação | Tem de matar |
|---|---|---|
| 1 | Remover `@Type(() => Number)` do `page` | os `typeof === 'number'` |
| 2 | Remover `@Min(1)` do `page` | vazio, `0` e `-5` |
| 3 | Remover `@IsInt()` do `page` | `1.5` e `abc` |
| 4 | Remover `@Max(LIMITE_MAXIMO)` | `999999` e `1001` |
| 5 | `LIMITE_MAXIMO = 500` | o teste do teto (o mapa da Home) |
| 6 | Trocar `@IsInt()` por `@IsNumber()` | `1.5` |

⚠️ Se alguma mutação ficar VERDE, o teste correspondente é decorativo e precisa ser reescrito antes
de seguir.

- [ ] **Step 5: Registrar a varredura**

Criar `docs/superpowers/plans/2026-09-20-varredura-chamadores.md` com o resultado real observado,
preenchendo a coluna "passou?" com o que os passos 1-3 mostraram:

```markdown
# Varredura de chamadores — card 16

## Quem pede `limit` alto (medido no client)

| chamador | limit | rota | local ou proxy | passou? |
|---|---|---|---|---|
| `getGeolocation` | 1000 | `/geo` | local (TypeORM) | |
| `getFrentes` | 1000 | `/frente` | proxy (ms já corta em 500) | |
| `getCategoriasCursinho` | 500 | `/cursinho/categoria` | proxy | |
| `getExames` | 500 | `/exame` | proxy | |

Nenhum outro consumidor: o `vcnafacul-app` (mobile) não usa listagem paginada.

## Quem lê o eco de `page`/`limit` na resposta

- `src/services/roles/getRoles.ts`
- `src/services/prepCourse/periodJustification/getPeriodJustifications.ts`
- `src/services/prepCourse/attendanceRecord/getAttendanceRecord.ts`

Os três apenas repassam adiante; nenhum consumidor usa o valor de forma sensível a tipo.

## Rotas que NÃO ficam cobertas por este card

`prova.controller` e `cursinho-prova.controller` usam `@Query('page') page?: string` soltos, sem
`GetAllDtoInput`. Continuam sem validação de `page`/`limit` — por outro caminho, não por esquecimento.

## Resultado

- Suíte unitária:
- E2E:
- Build e lint:
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/plans/2026-09-20-varredura-chamadores.md
git commit -m "docs: varredura de chamadores do card 16"
```

---

## Critérios de aceite (do spec §8)

- [ ] `page` e `limit` recusam não-número com 400
- [ ] `page` mínimo 1 — nunca mais chega `skip` negativo ao MySQL
- [ ] `limit` com teto de 1000; `limit=1000` continua passando
- [ ] Ambos chegam ao repositório como `number`
- [ ] Ausentes continuam produzindo os defaults 1 e 100
- [ ] As 9 subclasses herdam (teste prova com `GetAllStudentDtoInput`)
- [ ] Varredura registrada
- [ ] Suíte, build e lint limpos
