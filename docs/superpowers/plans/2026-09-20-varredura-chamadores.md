# Varredura de chamadores — card 16

## Quem pede `limit` alto (medido no client)

| chamador | limit | rota | local ou proxy | passou? |
|---|---|---|---|---|
| `getGeolocation` | 1000 | `/geo` | local (TypeORM) | |
| `getFrentes` | 1000 | `/frente` | proxy (ms já corta em 500) | |
| `getCategoriasCursinho` | 500 | `/cursinho/categoria` | proxy | |
| `getExames` | 500 | `/exame` | proxy | |

Nenhum outro consumidor: o `vcnafacul-app` (mobile) não usa listagem paginada.

## Chamadas internas acima do teto — NÃO afetadas

`role.service.ts:46` (limit 10000), `student-course.service.ts:523` (9999) e quatro pontos de
`student-course.e2e-spec.ts` (9999) passam objetos literais direto a `findAllBy`. Não atravessam o
`ValidationPipe`, então o `@Max` não os alcança — o teto vale só na borda HTTP.

## Quem lê o eco de `page`/`limit` na resposta

- `src/services/roles/getRoles.ts`
- `src/services/prepCourse/periodJustification/getPeriodJustifications.ts`
- `src/services/prepCourse/attendanceRecord/getAttendanceRecord.ts`

Os três apenas repassam adiante; nenhum consumidor usa o valor de forma sensível a tipo.

## Rotas que NÃO ficam cobertas por este card

`prova.controller` e `cursinho-prova.controller` usam `@Query('page') page?: string` soltos, sem
`GetAllDtoInput`. Continuam sem validação de `page`/`limit` — por outro caminho, não por esquecimento.

## Resultado medido

- **Suíte unitária** (`npx jest src`): 76 suítes, 719 testes — todos verdes, nenhuma falha. Nenhum
  teste de service que passa `page: '1'` como string precisou de conserto: esses caminhos não
  atravessam o `ValidationPipe`, então continuaram válidos como estavam.
- **E2E** (`npm run test`): 97 suítes, 977 testes — **todos verdes**, exit 0, cobertura de lines em
  76,67% (threshold 70%). Nem as duas falhas pré-existentes que o CLAUDE.md registra apareceram
  nesta execução: `student-course.e2e-spec.ts` (flaky de email duplicado do faker) e
  `inscription-course.e2e-spec.ts` (offset de 1 dia por timezone/DST) passaram as duas. São flaky
  por natureza, então a ausência aqui é sorte do sorteio, não conserto deste card.
  - `test/prova.e2e-spec.ts` **passou** — confirma que a mudança não vazou para as rotas que usam
    `@Query('page')` solto, como previsto.
  - `test/student-course.e2e-spec.ts` **passou**, incluindo o caso da linha 403 que monta
    `limit=1000` na querystring: o `@Max(LIMITE_MAXIMO)` é inclusivo, então o teto exato passa.
- **Build** (`npm run build`): exit 0, sem erro de tipo. Relevante porque o `@Type(() => Number)`
  fez o tipo declarado (`number`) finalmente casar com o que chega em runtime.
- **Lint** (`npx eslint` nos 3 arquivos tocados): exit 0, nenhum aviso.
