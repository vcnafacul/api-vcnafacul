# Card 05 · Proxy do caderno no api-vcnafacul

**POC:** Caderno · Overleaf · **Branch:** `feature/caderno-05-proxy-api` (de `poc/caderno-overleaf`, criada da `develop`)
**Card:** `docs/prova-latex-overleaf/cards/05-proxy-api-vcnafacul.md` · **Depende de:** card 04 (mergeado, ms-simulado PR #180)

---

## O que é

Expõe o caderno para o frontend. O `ms-simulado` entrega o zip em
`GET /v1/caderno/:simuladoId?draft=true`; este card põe o proxy autenticado na frente.

É o primeiro card desta POC fora do `ms-simulado`.

## O card é menor e maior do que parece

**Menor:** o proxy em si são ~40 linhas, clone do `cartao-resposta`.

**Maior:** o transporte binário compartilhado **entrega erro corrompido hoje**, e o cartão-resposta
sofre do mesmo defeito em produção. A maior parte do trabalho é isso.

---

## O defeito, medido

`getBinary` usa `responseType: 'arraybuffer'`. Quando o ms responde erro, o corpo chega como `Buffer`,
e `handleError` (`src/shared/services/axios/http-service-axios.factory.ts:31-47`) o repassa cru:

```ts
const errorData = axiosError?.response?.data || {...};
throw new HttpException(errorData, axiosError?.response?.status ?? 500);
```

O `ControllerExceptionsFilter` então trata o `Buffer` como objeto puro — `typeof 'object'`, não-nulo,
não-array — e **espalha**:

```ts
...(isPlainObject ? (body as Record<string, unknown>) : {}),
```

**Medido**, com o 409 real do card 04:

| | |
|---|---|
| status | `409` ✅ sobrevive |
| chaves no corpo | **81**, começando em `0, 1, 2, 3, 4, 5…` |
| `message` | `{"type":"Buffer","data":[123,34,…]}` |
| contém a frase original | **não** |

O card 04 gastou trabalho para o 409 dizer *"simulado não está pronto (questões pendentes ou
incompletas)"*. Sem esta correção, o card 06 não tem o que mostrar num toast.

⚠️ **Isto vale para o `baixarCartao` hoje**, mesmo caminho. Ninguém percebeu porque o client mostra
mensagem genérica.

---

## A correção, na factory compartilhada

Decisão: corrigir onde o defeito mora, não contorná-lo no módulo do caderno. O cartão ganha junto, e
o próximo proxy binário nasce certo.

### `handleError` desembrulha antes de repassar

```
data é Buffer?
  ├─ JSON.parse(utf-8) funciona  → repassa o objeto (caminho normal)
  ├─ é texto legível             → { message: <texto> }
  └─ não é texto                 → { message: 'erro no serviço de simulados' }
não é Buffer                     → como hoje
```

⚠️ Os três ramos existem porque o ms **não é a única coisa que responde**. Um proxy reverso ou um
balanceador no meio devolve HTML de erro, e um `JSON.parse` solto lançaria de dentro do tratamento de
erro — trocando um 409 legível por um 500 sem causa aparente.

⚠️ **"É texto legível" não é `buffer.length > 0`.** Um corpo binário decodificado como utf-8 vira
`�` (replacement char) e uma `message` ilegível na tela do usuário. O critério é a ausência
desse caractere.

### `getBinary` devolve os headers

```ts
Promise<{ buffer: Buffer; contentType: string; headers: Record<string, string> }>
```

Aditivo: o cartão desestrutura `{ buffer, contentType }` e não vê diferença. É o que permite o
`X-Caderno-Avisos` atravessar.

---

## O proxy

```
src/modules/simulado/caderno/
├── caderno.controller.ts       GET mssimulado/caderno/:simuladoId
├── caderno.controller.spec.ts
├── caderno-http.service.ts
└── caderno-http.service.spec.ts
```

Registrado em `simulado.module.ts`, ao lado do `CartaoRespostaController`.

```ts
@ApiTags('Simulado - Caderno')
@Controller('mssimulado/caderno')

@Get(':simuladoId')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@SetMetadata(PermissionsGuard.name, Permissions.visualizarProvas)
```

- `Content-Disposition: attachment` — **não** `inline`. Zip não se abre no navegador.
- Nome do arquivo: `caderno-<simuladoId>.zip`.
- `?draft=true` concatenado na URL do ms. **Só a string exata `'true'` emite o literal
  `?draft=true`**; qualquer outro valor não emite nada. Não é estilo: concatenar o valor cru injeta
  parâmetro na chamada interna — medido, `draft=true&x=1` vira
  `v1/caderno/ID?draft=true&x=1`.
- `X-Caderno-Avisos` copiado da resposta do ms, quando presente.

### Uma diferença deliberada do cartão: `JwtAuthGuard`

O `baixarCartao` usa `@UseGuards(PermissionsGuard)` sozinho. O `PermissionsGuard` verifica o JWT ele
mesmo, mas devolve `false` quando não há token — e o Nest traduz `false` para **403**, não 401.

O card pede 401 para requisição sem JWT. Os outros três endpoints do controller do cartão já usam
`JwtAuthGuard, PermissionsGuard`; o `baixarCartao` é que é a exceção. O caderno segue a maioria.

⚠️ Não mexemos no `baixarCartao`: mudar o status de erro de um endpoint em produção é mudança de
contrato, e não é o assunto deste card.

---

## O `simuladoId` precisa ser validado antes de entrar na URL

Descoberto na revisão desta spec, e medido ponta a ponta.

`getFullURL` concatena strings, e o Express entrega o parâmetro **já decodificado**. Com isso:

```
GET /mssimulado/caderno/..%2F..%2Fv1%2Fsimulado%2Foutro
       Express casa como UM segmento (200) e decodifica
       → simuladoId = '../../v1/simulado/outro'
       → api chama http://ms-simulado:3000/v1/simulado/outro
```

Medido, com os quatro valores testados:

| `simuladoId` recebido | URL que a api chama |
|---|---|
| `65ecc850a528b39d273e7900` | `…/v1/caderno/65ecc850a528b39d273e7900` |
| `../../v1/simulado/outro` | **`…/v1/simulado/outro`** |
| `abc?draft=true` | `…/v1/caderno/abc?draft=true` |
| `abc#frag` | `…/v1/caderno/abc#frag` |

Quem tem `visualizarProvas` alcança **qualquer rota do ms-simulado**, usando a posição de rede da api
— inclusive rotas que a api expõe atrás de outras permissões. É travessia de fronteira de privilégio,
não só uma URL feia.

**A correção é allowlist, não sanitização:** o `simuladoId` é um ObjectId do Mongo. Vinte e quatro
caracteres hexadecimais, ou `400`.

```ts
if (!/^[0-9a-f]{24}$/i.test(simuladoId)) throw new BadRequestException(...);
```

⚠️ **Allowlist e não uma lista de caracteres proibidos.** Tentar remover `..`, `?`, `#` e `%` é a
forma que sempre deixa um passar — `%252F` sobrevive a uma rodada de decodificação, e a lista nunca
acaba. O formato do id é fechado e conhecido; usá-lo é mais curto e não tem buraco.

⚠️ **O `baixarCartao` tem o mesmo buraco, hoje, em produção** — mesma concatenação, mesmo
`getBinary`. Este card não o corrige: mudar o comportamento de um endpoint em produção é decisão
separada, e um `400` novo onde antes havia `404` é mudança de contrato. **Registrado como observação
com prioridade**, junto do ticket de escopo de cursinho.

## Permissão: `visualizarProvas`, sem escopo de cursinho

Igual ao cartão.

O card pedia para *"confirmar em homologação que colaborador de cursinho baixa o caderno do próprio
cursinho e não o de outro"*. **Medido: não há escopo nenhum.** `visualizarProvas` é booleano global
(`PermissionsGuard` chama `checkUserPermission(userId, permission)`), e o cartão não filtra por
cursinho — quem tem a permissão baixa o cartão de qualquer simulado.

Existe `visualizarProvasCursinho` e um `CursinhoResolverService` que resolve o cursinho pelo usuário
(usado em `prova/cursinho/cursinho-prova.controller.ts`), então escopar seria possível.

**Decisão do usuário:** o caderno segue o cartão. Se a falta de escopo é problema, é problema das duas
features, e consertá-las juntas num ticket próprio é mais honesto do que o caderno divergir sozinho —
o que produziria o resultado absurdo de o caderno de um simulado ser negado e o cartão do mesmo
simulado, liberado.

⚠️ Registrado como observação para esse ticket, **não** como trabalho deste card.

---

## Testes

### Factory (é onde está o risco)

- `Buffer` com JSON válido → objeto, com a `message` original, status preservado
- `Buffer` com texto solto (HTML de proxy reverso) → `{ message: <texto> }`, **sem lançar**
- `Buffer` com bytes não-texto → mensagem genérica, **sem `�` vazando**
- corpo não-binário → exatamente como hoje (regressão do cartão)
- sem `response` (timeout, DNS) → 500 genérico, como hoje
- `getBinary` devolve `headers` junto de `buffer` e `contentType`
- a suíte inteira do `cartao-resposta` passa **sem alteração**

### Proxy

- delega ao service com o `simuladoId`
- `Content-Disposition: attachment`, com o nome certo
- `X-Caderno-Avisos` repassado quando o ms manda; ausente quando não manda
- `?draft=true` chega na URL do ms; `?draft=false` e `?draft=xpto` **não**
- `draft=true&x=1` não injeta o `x=1` na chamada interna
- o buffer sai byte-idêntico ao que entrou

### Validação do `simuladoId`

- ObjectId válido passa
- `../../v1/simulado/outro` → `400`, e **o service não é chamado**
- `abc?draft=true`, `abc#frag`, `abc/def` → `400`
- 23 e 25 hex → `400`; maiúsculas → passa
- a asserção que importa: **nenhuma URL construída pelo service contém `..`, `?`, `#` ou `/` no
  lugar do id**

### E2E

`overrideProvider` no `CadernoHttpService`, cobrindo:

| | |
|---|---|
| 200 | zip, com os headers |
| 401 | sem JWT |
| 403 | JWT sem `visualizarProvas` |
| 409 | **com a mensagem original legível** — é o teste que prova a correção da factory ponta a ponta |

⚠️ Seria o primeiro e2e do módulo de simulado — o cartão só tem unitário. A infra existe (13 specs,
`overrideProvider` é o padrão da casa).

## Critérios de aceitação

- [ ] Todos os testes acima
- [ ] Zip do proxy byte-idêntico ao do ms
- [ ] `simuladoId` fora do formato de ObjectId → `400`, sem tocar no ms
- [ ] 409 chega no client com a mensagem original, legível
- [ ] Swagger documentado
- [ ] Suíte do `cartao-resposta` passa sem alteração
- [ ] `yarn build` limpo

## Gate

Manual, e menor que os anteriores: `curl` autenticado no endpoint da api, conferindo que o zip baixado
abre e que o 409 de um simulado bloqueado chega legível.

⚠️ Exige o `ms-simulado` rodando com a `poc/caderno-overleaf`, e `SIMULADO_URL` apontando para ele.

## Risco

⚠️ **Este card deixa de ser puramente aditivo.** Além do proxy novo, ele corrige transporte
compartilhado e fecha uma travessia de privilégio. O `baixarCartao` continua exposto, e isso é
decisão consciente, registrada — não esquecimento.

**Baixo para o proxy, médio para a factory.** O proxy é padrão já em produção. A factory é
compartilhada por todos os módulos que falam com o ms — daí a suíte do cartão como rede de segurança,
e o teste de regressão do caminho não-binário.

## O que este card NÃO faz

**Não endurece o `ControllerExceptionsFilter`.** O `isPlainObject` dele é frágil para qualquer objeto
não-puro — `Buffer`, `Date`, `Map`. Corrigir o `handleError` remove o único produtor conhecido, e o
filtro é `/* istanbul ignore file */`, sem teste por decisão explícita. Mexer nele sem cobertura seria
trocar um defeito conhecido por um alterado às cegas.

Registrado como observação.
