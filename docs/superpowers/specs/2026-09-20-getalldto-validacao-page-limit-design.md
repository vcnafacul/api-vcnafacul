# `GetAllDtoInput`: validar `page` e `limit` — design

**Card:** `docs/cards/relatorio-simulado-cursinho/16-BACK-getalldto-sem-validacao.md`
**Repo:** `api-vcnafacul` · **Branch:** `feature/16-getalldto-validacao-page-limit`
**Data:** 2026-09-20 · **Origem:** revisão do card `11`

---

## 1. O defeito

`src/shared/dtos/get-all.dto.input.ts`, arquivo inteiro:

```ts
export class GetAllDtoInput implements GetAllInput {
  @ApiProperty({ default: 1, required: false })
  @IsOptional()
  page: number = 1;

  @ApiProperty({ default: 100, required: false })
  @IsOptional()
  limit: number = 100;
}
```

`@IsOptional()` e mais nada. O `main.ts` instala `ValidationPipe({ transform: true, whitelist: true })`
— **sem `enableImplicitConversion`**, então sem `@Type()` nada converte. O valor sai do querystring
como string e chega como string ao repositório.

O tipo declarado diz `number`. Em runtime é `string`. **A interface `GetAllInput` mente**, e é essa
mentira que produz todos os sintomas abaixo.

**9 DTOs estendem a classe; 31 arquivos a referenciam** (o card dizia 32 — recontado).

## 2. O que acontece hoje — medido, não deduzido

Probe pelo `ValidationPipe` real com as opções do `main.ts`, e o resultado levado ao
`base.repository.findAllBy`, que faz `.skip((page - 1) * limit).take(limit)`:

| entrada | tipo depois do pipe | `skip` | resultado real |
|---|---|---|---|
| ausente | `number` 1 / 100 | 0 | ✅ default funciona |
| `page=2` | **string** `"2"` | 10 | ✅ **funciona por acidente** |
| `page=0` | string `"0"` | **-10** | `ER_PARSE_ERROR` → **500** |
| `page=` (só a chave) | string `""` | **-10** | `ER_PARSE_ERROR` → **500** |
| `page=-5` | string `"-5"` | **-60** | `ER_PARSE_ERROR` → **500** |
| `page=abc` | string `"abc"` | **NaN** | `TypeORMError: Provided "skip" value is not a number` → **500** |
| `page[$ne]=` | **objeto** `{$ne:...}` | NaN | idem → 500 |
| `limit=99999999` | string | 0 | `LIMIT 99999999` — **devolve a tabela inteira** |
| `limit=1e9` | string | 0 | `LIMIT 1000000000` — idem |

⚠️ **O caminho feliz sobrevive por coerção aritmética do JavaScript:** `("2" - 1) * "10"` é `10`.
É por isso que isto atravessou anos sem ninguém notar — o defeito só aparece na borda.

**Medições de apoio:**
- MySQL 8 com `LIMIT 2 OFFSET -10` → `ERROR 1064 (42000)`. O TypeORM **não valida** o negativo e o
  emite inline no SQL (não parametrizado).
- `.skip(NaN)` o TypeORM barra ele mesmo, lançando `TypeORMError` — também 500.
- `?page=` **vazio já basta** para derrubar a rota. É o caso mais fácil de disparar por acidente:
  qualquer frontend que monte a URL a partir de um estado ainda não preenchido produz isso.

### O que NÃO é

Não é vazamento de dado de outro usuário. `whitelist: true` deixa o objeto `{$ne:...}` passar (a
chave `page` é conhecida), mas todo consumidor faz aritmética antes de usar, e o objeto vira `NaN`
em vez de chegar ao banco. O vazamento pela query era o card `11`, já corrigido.

O defeito aqui é **500 trivial de disparar** e **dump de tabela sem teto**.

## 3. Decisões

### 3.1 Teto do `limit`: **1000**

O `ms-simulado` já resolveu o mesmo problema no `ms#186` (`66e3e8e`, na develop) com teto **500**,
medido contra a tela `partnerPrepProvas`.

⚠️ **Aqui o teto diverge, e o motivo foi medido:** o client pede `limit=1000` em rotas **locais** da
api, que o ms não tem.

| chamador do client | `limit` | o que é |
|---|---|---|
| `getGeolocation` | **1000** | **mapa da Home** (`MapSection`) — rota local `/geo` (TypeORM). Página **pública** |
| `getFrentes` | **1000** | `useFrentesSelection` — um `<select>`. Rota proxy (o ms já corta em 500 hoje) |
| `getCategoriasCursinho` | 500 | filtro do `partnerPrepProvas` |
| `getExames` | 500 | select do modal `manageCategorias` |

**Nenhuma das quatro é listagem paginada** — são *lookups* que precisam do conjunto inteiro. Não se
pagina um mapa nem um `<select>`. A alternativa "teto menor + o front pagina" não se aplica a elas.

⚠️ **E o clamp é silencioso:** com teto 500, um mapa de 600 pontos perderia 100 na Home sem erro,
sem log, sem nada. Esse foi o argumento decisivo.

O maior pedido real medido é 1000. O teto é 1000: barra `?limit=999999` sem tirar ponto do mapa nem
opção de select. **Nenhum consumidor além do client existe** — o `vcnafacul-app` (mobile) não usa
listagem paginada em lugar nenhum (verificado).

### 3.2 `page` inválido: **400**, não clamp

Hoje todo `page` inválido **já é erro** — um 500. Devolver 400 não quebra nenhum chamador que hoje
funcione; troca um erro que parece defeito de servidor (e suja o Grafana) por uma recusa honesta.

Clamp silencioso para 1 foi descartado: faria `?page=` passar a "funcionar", escondendo o bug de
quem chamou errado.

### 3.3 Coagir para `number`: **sim**

⚠️ O ms **recusou** a coerção de propósito, e o motivo está no docblock dele: o `limit` ecoa no corpo
(`GetAllDtoOutput`), e `"10"` → `10` seria quebra silenciosa para todo cliente do ms.

A api tem o **mesmo eco** — `base.repository.findAllBy` devolve `{ data, page, limit, totalItems }` —
e **3 services do client leem esse eco**:

- `src/services/roles/getRoles.ts`
- `src/services/prepCourse/periodJustification/getPeriodJustifications.ts`
- `src/services/prepCourse/attendanceRecord/getAttendanceRecord.ts`

**Medido:** os três apenas repassam os campos adiante num objeto de retorno; nenhum consumidor os usa
de forma sensível a tipo (comparação com string, concatenação, `switch`). O risco é baixo e o ganho é
que o tipo declarado passa a ser verdade.

A coerção vai acompanhada de **teste que fixa o formato da resposta**, para que a mudança seja
deliberada e vigiada, não um efeito colateral.

### 3.4 Ganho colateral: a concatenação nos proxies fica segura

Cinco serviços montam a URL do ms por concatenação crua:

```
src/modules/simulado/simulado.service.ts:35   v1/simulado?page=${page}&limit=${limit}
src/modules/simulado/subject/subject.service.ts:26
src/modules/simulado/content/content.service.ts:78
src/modules/simulado/materia/materia.service.ts:24
src/modules/simulado/frente/frente.service.ts:35
```

É a mesma classe do card `11`. Aqui não há escopo de usuário a vazar (são listagens globais), mas um
`page` com `#` quebraria a query e o `limit` sumiria.

**Com `@Type(() => Number)` + `@IsInt()`, um inteiro validado não pode conter `#`, `&` ou `?`.** A
validação vira a defesa da concatenação. Registrar isso no código — não trocar por `URLSearchParams`
neste card, que é escopo do `11`.

## 4. O conserto

**Um arquivo de produção:** `src/shared/dtos/get-all.dto.input.ts`.

```ts
export const LIMITE_MAXIMO = 1000;

export class GetAllDtoInput implements GetAllInput {
  @ApiProperty({ default: 1, required: false, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiProperty({ default: 100, required: false, minimum: 1, maximum: LIMITE_MAXIMO })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIMITE_MAXIMO)
  limit: number = 100;
}
```

Acompanhado de docblocks registrando: o teto e por que 1000 e não 500; que a coerção é o que torna
segura a concatenação dos cinco proxies; e a limitação do §6.

**O comportamento resultante, medido no desenho proposto antes de escrevê-lo aqui:**

| entrada | depois |
|---|---|
| ausente | `page=1` `limit=100` (`number`) ✅ |
| `page=2&limit=10` | `number` 2 / 10 |
| `page=` / `0` / `-5` | **400** `page must not be less than 1` |
| `page=abc` | **400** `page must be an integer number` |
| `page=1.5` | **400** |
| `page[$ne]=` / `page[]=1&page[]=2` | **400** |
| `limit=1000` | passa ✅ |
| `limit=1001` / `999999` | **400** `limit must not be greater than 1000` |

## 5. Testes

Arquivo novo: `src/shared/dtos/get-all.dto.input.spec.ts`.

⚠️ **Passando pelo `ValidationPipe` real com as MESMAS opções do `main.ts`** (`transform: true`,
`whitelist: true`, `forbidNonWhitelisted: false`). Instanciar a classe com `new` não prova nada: nesse
caminho o `@Type` do class-transformer nunca roda. O spec do ms usa exatamente essa técnica e serve de
modelo.

Casos obrigatórios:

1. Ausente → `page=1`, `limit=100`, ambos `number`
2. `page=2` → `2` e **`typeof === 'number'`** (a coerção é o ponto)
3. `page=` vazio → 400 (o mais fácil de disparar por acidente)
4. `page=0`, `page=-5`, `page=abc`, `page=1.5` → 400
5. `page` como objeto e como array → 400
6. `limit=1000` passa; `limit=1001` e `limit=999999` → 400
7. Uma subclasse (ex.: `GetAllStudentDtoInput`) herda tudo isso — prova que vale para os 9
8. ⚠️ **Sentinela do default:** `{ page: undefined }` explícito **perde** o default (o
   class-transformer não aplica o inicializador quando a chave existe). Querystring nunca produz
   isso, mas o teste registra o limite para quem for mexer depois. Mesmo modo de falha que o ms
   documentou.
9. ⚠️ **Teste do eco:** uma listagem devolve `page`/`limit` como `number` no corpo. Fixa a mudança
   do §3.3 para que ninguém a desfaça sem ver.

**Mutações que os testes precisam matar:** remover `@Type` (volta a string); remover `@Min(1)` (volta
o 500 por OFFSET negativo); remover `@Max` (volta o dump); trocar `@IsInt` por `@IsNumber` (`1.5`
passa); mudar `LIMITE_MAXIMO` para 500 (o mapa da Home perde pontos).

## 6. Limitação conhecida e aceita

⚠️ **`page=1e9` passa.** `Number("1e9")` é `1000000000`, um inteiro válido, e `@IsInt()` o aceita.
Produz `OFFSET ~1e11` — scan caro no MySQL, mas **não é erro nem vazamento**: devolve lista vazia.

Fica sem `@Max` no `page` porque qualquer teto seria arbitrário (o número legítimo de páginas depende
da tabela e do `limit`). Registrado em comentário no código para não ser redescoberto como novidade.

## 7. Fora de escopo

- Trocar a concatenação dos 5 proxies por `URLSearchParams` — classe do card `11`.
- `AggregatePeriodDtoInput`, `SearchUsersDtoInput`, `SearchGeoDtoInput` — não estendem `GetAllDtoInput`.
- Os lookups que usam DTO de paginação para carregar conjunto inteiro (§3.1). É a correção de raiz do
  teto alto, atravessa 2 repos e 4 telas, e não é este card.
- `src/services/roles/getRoles.ts:18` tem `limit: res.page` (copiar-colar errado). Achado de passagem,
  repo do client, não é este card.

## 8. Critérios de aceite

- [ ] `page` e `limit` recusam não-número com **400**
- [ ] `page` mínimo 1 — nunca mais chega `skip` negativo ao MySQL
- [ ] `limit` com teto de 1000; `limit=1000` continua passando
- [ ] Ambos chegam ao repositório como `number`
- [ ] Ausentes continuam produzindo os defaults 1 e 100
- [ ] As 9 subclasses herdam o comportamento (teste prova ao menos uma)
- [ ] Varredura de chamadores registrada no PR (§3.1), dizendo quem pedia o quê
- [ ] Suíte e build limpos
