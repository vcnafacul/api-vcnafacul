# Caderno · Overleaf — Card 05: proxy no api-vcnafacul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expor o caderno do `ms-simulado` para o frontend, autenticado — e consertar o transporte binário compartilhado, que hoje entrega erro corrompido.

**Architecture:** Duas frentes. Uma correção na factory de HTTP compartilhada (desembrulhar corpo de erro binário, devolver headers) e um proxy novo em `simulado/caderno/`, clone do `cartao-resposta` com um pipe de validação na frente.

**Tech Stack:** NestJS 10, TypeScript, Jest, supertest. **Nenhuma dependência nova.**

**Spec:** `docs/superpowers/specs/2026-09-12-caderno-overleaf-proxy-api-design.md`

---

## Contexto que o plano assume

**O `ms-simulado` já entrega o zip.** `GET /v1/caderno/:simuladoId?draft=true`, mergeado (PR #180).
Este card não gera nada: ele repassa.

**O card parecia S e não é.** O proxy são ~40 linhas; a substância é a factory.

### Os três defeitos medidos, e o que cada um faz

| | medido |
|---|---|
| **Corpo de erro** | `responseType: 'arraybuffer'` faz o corpo de erro chegar como `Buffer`. O `handleError` repassa cru, e o `ControllerExceptionsFilter` o **espalha**: o 409 sai com **81 chaves** começando em `0, 1, 2, 3…`, e a `message` vira `{"type":"Buffer","data":[…]}` |
| **Headers** | `getBinary` devolve só `{buffer, contentType}` — o `X-Caderno-Avisos` não tem por onde passar |
| **Injeção de caminho** | `simuladoId = '../../v1/simulado/outro'` faz a api chamar `http://ms-simulado:3000/v1/simulado/outro`. Express casa `..%2F..%2F` como **um** segmento e entrega o valor **decodificado** |

Os três valem para o `baixarCartao` hoje, em produção. Os dois primeiros são consertados aqui (a
correção é na factory compartilhada). O terceiro **não** — ver "O que este card não faz".

## Restrições do repo

- ⚠️ **Nunca** `yarn lint` nem `npx eslint <diretório>`: reformata arquivos não relacionados. Sempre caminhos de arquivo explícitos.
- ⚠️ **Nunca** `git add -A` nem `git add .`.
- Jest unitário: `npx jest <caminho>`. E2E: `npm run test:local` (precisa de MySQL na 3307) ou `npm test` (sobe Docker).
- Branch `feature/caderno-05-proxy-api`, criada de `poc/caderno-overleaf`, que saiu da `develop`. Commits autônomos liberados.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/shared/services/axios/http-service-axios.factory.ts` | **modificado**: desembrulhar erro binário, devolver headers |
| `src/shared/pipes/object-id.pipe.ts` | valida que o param é ObjectId. Diretório novo. |
| `src/modules/simulado/caderno/caderno-http.service.ts` | chama o ms |
| `src/modules/simulado/caderno/caderno.controller.ts` | `GET mssimulado/caderno/:simuladoId` |
| `src/modules/simulado/simulado.module.ts` | **modificado**: registra os dois |
| `test/caderno.e2e-spec.ts` | 200, 401, 403, 409 |

---

### Task 1: A factory — desembrulhar o erro e devolver os headers

**Files:**
- Modify: `src/shared/services/axios/http-service-axios.factory.ts`
- Modify: `src/shared/services/axios/http-service-axios.spec.ts`

É a task de maior risco do card: esta factory é usada por todos os módulos que falam com o ms.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar a `src/shared/services/axios/http-service-axios.spec.ts`. **Confira primeiro como o
arquivo monta o `HttpServiceAxios`** e reaproveite os helpers que já existem lá em vez de criar
outros.

```ts
describe('handleError — corpo de erro binário', () => {
  // Com `responseType: 'arraybuffer'`, o corpo de erro chega como Buffer.
  // Sem desembrulhar, o ControllerExceptionsFilter o trata como objeto puro e
  // ESPALHA: o 409 sai com 81 chaves começando em "0","1","2" e a mensagem
  // vira {"type":"Buffer","data":[...]}. Medido.
  const erroBinario = (corpo: Buffer | string, status: number) => ({
    isAxiosError: true,
    response: { status, data: corpo },
  });

  it('Buffer com JSON válido volta a ser objeto, com a mensagem', () => {
    const corpo = Buffer.from(
      JSON.stringify({
        message: 'simulado não está pronto (questões pendentes ou incompletas)',
        statusCode: 409,
      }),
    );
    const ex = capturarHttpException(erroBinario(corpo, 409));
    expect(ex.getStatus()).toBe(409);
    expect(ex.getResponse()).toEqual({
      message: 'simulado não está pronto (questões pendentes ou incompletas)',
      statusCode: 409,
    });
  });

  it('Buffer com texto que não é JSON vira message, sem lançar', () => {
    // O ms não é a única coisa que responde: um proxy reverso ou um
    // balanceador no meio devolve HTML. Um JSON.parse solto lançaria de
    // DENTRO do tratamento de erro, trocando um 409 legível por um 500 sem
    // causa aparente.
    const ex = capturarHttpException(
      erroBinario(Buffer.from('<html><body>502 Bad Gateway</body></html>'), 502),
    );
    expect(ex.getStatus()).toBe(502);
    expect((ex.getResponse() as any).message).toContain('502 Bad Gateway');
  });

  it('Buffer com bytes que não são texto vira mensagem genérica', () => {
    // Decodificar binário como utf-8 produz U+FFFD. Deixar passar poria
    // "����" na tela do usuário.
    const ex = capturarHttpException(
      erroBinario(Buffer.from([0xff, 0xfe, 0x00, 0x80, 0x81]), 500),
    );
    const corpo = ex.getResponse() as any;
    expect(corpo.message).toBe('erro no serviço de simulados');
    expect(JSON.stringify(corpo)).not.toContain('�');
  });

  it('trunca corpo enorme em vez de despejar a página inteira', () => {
    // O card 06 mostra isto num toast.
    const ex = capturarHttpException(
      erroBinario(Buffer.from('x'.repeat(5000)), 502),
    );
    expect((ex.getResponse() as any).message.length).toBeLessThanOrEqual(320);
  });

  it('Buffer vazio vira mensagem genérica', () => {
    const ex = capturarHttpException(erroBinario(Buffer.alloc(0), 500));
    expect((ex.getResponse() as any).message).toBe('erro no serviço de simulados');
  });

  it('corpo NÃO binário continua exatamente como hoje', () => {
    // Regressão: é o caminho de todo o resto da api.
    const ex = capturarHttpException(
      erroBinario({ message: 'categoria em uso', simuladosUsando: 3 } as any, 409),
    );
    expect(ex.getResponse()).toEqual({
      message: 'categoria em uso',
      simuladosUsando: 3,
    });
  });

  it('sem response (timeout, DNS) continua 500 genérico', () => {
    const ex = capturarHttpException({ isAxiosError: true, code: 'ECONNREFUSED' });
    expect(ex.getStatus()).toBe(500);
  });
});

describe('getBinary — headers', () => {
  it('devolve os headers junto do buffer e do contentType', async () => {
    const { service } = montarComRespostaBinaria({
      data: Buffer.from('ZIP'),
      headers: { 'content-type': 'application/zip', 'x-caderno-avisos': '3' },
    });
    const r = await service.getBinary('v1/caderno/abc');
    expect(r.buffer).toEqual(Buffer.from('ZIP'));
    expect(r.contentType).toBe('application/zip');
    expect(r.headers['x-caderno-avisos']).toBe('3');
  });

  it('normaliza o nome do header para minúsculas', async () => {
    // ⚠️ MEDIDO: em `AxiosHeaders`, acesso por índice é case-SENSITIVE —
    // `h['x-caderno-avisos']` devolve undefined quando o header chegou como
    // `X-Caderno-Avisos`. E header que não passa não dá erro: ele some.
    const { service } = montarComRespostaBinaria({
      data: Buffer.from('ZIP'),
      headers: { 'Content-Type': 'application/zip', 'X-Caderno-Avisos': '7' },
    });
    const r = await service.getBinary('v1/caderno/abc');
    expect(r.headers['x-caderno-avisos']).toBe('7');
  });

  it('sem o header, a chave simplesmente não existe', async () => {
    const { service } = montarComRespostaBinaria({
      data: Buffer.from('ZIP'),
      headers: { 'content-type': 'application/zip' },
    });
    const r = await service.getBinary('v1/caderno/abc');
    expect(r.headers['x-caderno-avisos']).toBeUndefined();
  });
});
```

⚠️ `capturarHttpException` e `montarComRespostaBinaria` são helpers **que você escreve** no topo do
describe, no estilo que o arquivo já usa. Se o spec existente já tiver equivalentes, **use os dele**.

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx jest src/shared/services/axios/http-service-axios.spec.ts
```

Esperado: FAIL nos novos, PASS nos que já existiam.

- [ ] **Step 3: Implementar**

Em `http-service-axios.factory.ts`, acrescente antes do `handleError`:

```ts
/**
 * Quanto de um corpo de erro em texto vira `message`.
 *
 * O card 06 mostra isso num toast: despejar uma página de erro de proxy
 * reverso inteira ali é pior do que truncar.
 */
const LIMITE_MENSAGEM = 300;

/**
 * Desembrulha o corpo de erro de uma resposta binária.
 *
 * ⚠️ Com `responseType: 'arraybuffer'`, o corpo de erro chega como `Buffer`,
 * não como objeto. Repassado cru, o `ControllerExceptionsFilter` o trata como
 * objeto puro e o **espalha**: o 409 sai com 81 chaves começando em
 * `"0","1","2"`, e a mensagem vira `{"type":"Buffer","data":[...]}`. Medido.
 *
 * ⚠️ Os três ramos existem porque **o ms não é a única coisa que responde**.
 * Um proxy reverso devolve HTML, e um `JSON.parse` solto lançaria de dentro do
 * tratamento de erro — trocando um 409 legível por um 500 sem causa aparente.
 */
function desembrulharCorpo(data: unknown): unknown {
  if (!Buffer.isBuffer(data)) return data;

  const texto = data.toString('utf-8');
  try {
    return JSON.parse(texto);
  } catch {
    // Não é JSON. `U+FFFD` é o que sobra de bytes que não eram texto —
    // deixar passar poria "����" na tela do usuário.
    const ehTexto = texto.trim().length > 0 && !texto.includes('�');
    return ehTexto
      ? { message: texto.slice(0, LIMITE_MENSAGEM) }
      : { message: 'erro no serviço de simulados' };
  }
}
```

E no `handleError`, troque a primeira linha:

```ts
    const errorData =
      desembrulharCorpo(axiosError?.response?.data) ||
      ({
        message: 'Erro desconhecido ou serviço indisponível.',
        status: axiosError?.code || 500,
      } as any);
```

E o `getBinary`:

```ts
  public async getBinary(
    url: string,
    headers?: Record<string, string>,
  ): Promise<{
    buffer: Buffer;
    contentType: string;
    headers: Record<string, string>;
  }> {
    const fullURL = this.getFullURL(url);
    return this.requestWrapper(
      this.axiosInstance
        .get(fullURL, { responseType: 'arraybuffer', headers })
        .then((response) => ({
          buffer: Buffer.from(response.data),
          contentType:
            (response.headers['content-type'] as string) ??
            'application/octet-stream',
          // ⚠️ Minúsculas SEMPRE. Em `AxiosHeaders` o acesso por índice é
          // case-sensitive: `h['x-caderno-avisos']` devolve `undefined` se o
          // header chegou como `X-Caderno-Avisos`. E header que não passa não
          // dá erro — ele some, e ninguém descobre.
          headers: Object.fromEntries(
            Object.entries({ ...response.headers }).map(([k, v]) => [
              k.toLowerCase(),
              String(v),
            ]),
          ),
        })),
    );
  }
```

⚠️ **Aditivo:** o `cartao-resposta-http.service` desestrutura `{ buffer, contentType }` e não vê
diferença. É por isso que a suíte dele é a rede de segurança desta task.

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx jest src/shared/services/axios/http-service-axios.spec.ts
npx jest src/modules/simulado/cartao-resposta
```

Esperado: PASS nos dois. **A suíte do cartão tem que passar sem uma linha alterada** — se você
precisar tocar em qualquer teste de `cartao-resposta`, algo está errado na sua mudança: **pare e
reporte**.

- [ ] **Step 5: Provar que quatro decisões mordem**

Uma de cada vez, restaurando entre elas. Cole as quatro saídas vermelhas.

| Mutação | Teste que precisa ficar vermelho |
|---|---|
| tirar o `desembrulharCorpo` do `handleError` | `Buffer com JSON válido volta a ser objeto` |
| `JSON.parse` sem o `try/catch` | `Buffer com texto que não é JSON vira message, sem lançar` |
| tirar a checagem de `�` | `Buffer com bytes que não são texto` |
| tirar o `.toLowerCase()` dos headers | `normaliza o nome do header para minúsculas` |

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/shared/services/axios/http-service-axios.factory.ts src/shared/services/axios/http-service-axios.spec.ts
npx eslint src/shared/services/axios/http-service-axios.factory.ts src/shared/services/axios/http-service-axios.spec.ts
git add src/shared/services/axios/http-service-axios.factory.ts src/shared/services/axios/http-service-axios.spec.ts
git commit -m "$(cat <<'EOF'
fix(axios): desembrulhar corpo de erro binario e devolver os headers

Com responseType arraybuffer o corpo de ERRO tambem chega como Buffer. O
handleError repassava cru e o ControllerExceptionsFilter, que trata Buffer
como objeto puro, ESPALHAVA: medido, o 409 saia com 81 chaves comecando em
"0","1","2" e a mensagem virava {"type":"Buffer","data":[...]}.

Vale pro baixarCartao hoje, em producao -- ninguem percebeu porque o
client mostra mensagem generica. Corrigido na factory, os dois ganham.

Tres ramos no desembrulho porque o ms nao e a unica coisa que responde:
proxy reverso devolve HTML, e um JSON.parse solto lancaria de dentro do
tratamento de erro. Bytes que nao sao texto viram mensagem generica, senao
sai "????" na tela.

getBinary passa a devolver os headers, em MINUSCULAS: medido, o acesso por
indice em AxiosHeaders e case-sensitive, e header que nao passa nao da
erro -- some.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PrN5kdVC3BqJMYTGnEL9K7
EOF
)"
```

---

### Task 2: `ObjectIdPipe` — fechar a injeção de caminho

**Files:**
- Create: `src/shared/pipes/object-id.pipe.ts`
- Create: `src/shared/pipes/object-id.pipe.spec.ts`

Diretório novo — não há pipes neste repo ainda. `src/shared/pipes/` é o lugar padrão do Nest, e pôr
em `shared/` (e não dentro do módulo do caderno) é o que permite o `cartao-resposta` adotá-lo depois
sem depender do caderno.

- [ ] **Step 1: Escrever o teste que falha**

`src/shared/pipes/object-id.pipe.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { ObjectIdPipe } from './object-id.pipe';

describe('ObjectIdPipe', () => {
  const pipe = new ObjectIdPipe();

  it('deixa passar um ObjectId', () => {
    expect(pipe.transform('65ecc850a528b39d273e7900')).toBe(
      '65ecc850a528b39d273e7900',
    );
  });

  it('aceita maiúsculas', () => {
    expect(pipe.transform('65ECC850A528B39D273E7900')).toBe(
      '65ECC850A528B39D273E7900',
    );
  });

  it('recusa o que sairia do caminho na URL do ms', () => {
    // ⚠️ MEDIDO: o Express casa `..%2F..%2F` como UM segmento (200) e entrega
    // o valor DECODIFICADO. Como o service concatena o id na URL, isso faz a
    // api chamar http://ms-simulado:3000/v1/simulado/outro — qualquer rota do
    // ms, com a posição de rede da api, inclusive rotas expostas atrás de
    // OUTRAS permissões.
    for (const hostil of [
      '../../v1/simulado/outro',
      'abc?draft=true',
      'abc#frag',
      'abc/def',
      '..%2F..%2Fv1',
      '%2E%2E%2Fv1%2Fsimulado%2Foutro',
      'http://169.254.169.254/',
    ]) {
      expect(() => pipe.transform(hostil)).toThrow(BadRequestException);
    }
  });

  it('recusa comprimento errado e caractere fora do hex', () => {
    expect(() => pipe.transform('65ecc850a528b39d273e790')).toThrow(); // 23
    expect(() => pipe.transform('65ecc850a528b39d273e79000')).toThrow(); // 25
    expect(() => pipe.transform('65ecc850a528b39d273e790g')).toThrow(); // g
  });

  it('recusa vazio, undefined e não-string', () => {
    expect(() => pipe.transform('')).toThrow();
    expect(() => pipe.transform(undefined as unknown as string)).toThrow();
    expect(() => pipe.transform(123 as unknown as string)).toThrow();
  });

  it('a mensagem não devolve o valor recebido', () => {
    // Ecoar a entrada num corpo de erro é como um XSS refletido nasce, e não
    // ajuda quem chamou: o formato esperado é a informação útil.
    try {
      pipe.transform('<script>alert(1)</script>');
      fail('deveria ter lançado');
    } catch (e) {
      expect(JSON.stringify((e as BadRequestException).getResponse())).not.toContain(
        'script',
      );
    }
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx jest src/shared/pipes/object-id.pipe.spec.ts
```

Esperado: FAIL — `Cannot find module './object-id.pipe'`.

- [ ] **Step 3: Implementar**

`src/shared/pipes/object-id.pipe.ts`:

```ts
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Garante que um parâmetro de rota é um ObjectId do Mongo antes de ele ser
 * concatenado numa URL.
 *
 * ⚠️ **Por que existe.** Os proxies para o `ms-simulado` montam a URL
 * concatenando o parâmetro (`getFullURL` só junta strings), e o Express
 * entrega o valor **já decodificado**. Medido:
 *
 * ```
 * GET /mssimulado/caderno/..%2F..%2Fv1%2Fsimulado%2Foutro
 *   → Express casa como UM segmento (200) e decodifica
 *   → api chama http://ms-simulado:3000/v1/simulado/outro
 * ```
 *
 * Quem tem a permissão do endpoint alcança **qualquer rota do ms**, com a
 * posição de rede da api — inclusive rotas expostas atrás de outras
 * permissões.
 *
 * ⚠️ **Allowlist, não lista de proibidos.** Remover `..`, `?`, `#` e `%` é a
 * forma que sempre deixa um passar: `%252F` sobrevive a uma rodada de
 * decodificação, e a lista nunca acaba. O formato do id é fechado.
 */
const OBJECT_ID = /^[0-9a-f]{24}$/i;

@Injectable()
export class ObjectIdPipe implements PipeTransform<string, string> {
  transform(valor: string): string {
    if (typeof valor !== 'string' || !OBJECT_ID.test(valor)) {
      // Não ecoa o valor recebido: é como um XSS refletido nasce, e o formato
      // esperado é a parte útil para quem chamou.
      throw new BadRequestException(
        'identificador inválido: esperado um ObjectId de 24 caracteres hexadecimais',
      );
    }
    return valor;
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx jest src/shared/pipes/object-id.pipe.spec.ts
```

Esperado: PASS, 6 testes.

- [ ] **Step 5: Provar que o formato fechado morde**

Troque `OBJECT_ID` por uma lista de proibidos — `if (/[./?#]/.test(valor)) throw …` — e confirme que
**`recusa comprimento errado e caractere fora do hex` fica vermelho**. Restaure.

E acrescente ao spec, de forma permanente, o caso que a lista de proibidos deixa escapar. **Medido:**

| valor | denylist `[./?#]` recusa? | allowlist recusa? |
|---|---|---|
| `../../v1/simulado/outro` | sim | sim |
| `%2E%2E%2Fv1%2Fsimulado%2Foutro` | **não** | sim |

```ts
  it('a lista de proibidos deixaria passar o duplo-codificado', () => {
    // `%2E%2E%2F` não contém `.`, `/`, `?` nem `#` — uma lista de caracteres
    // proibidos o aceita. Depois de mais uma rodada de decodificação, é `../`.
    // É por isso que a regra é allowlist: o formato do id é fechado, e a
    // lista de coisas ruins nunca acaba.
    expect(() => pipe.transform('%2E%2E%2Fv1%2Fsimulado%2Foutro')).toThrow();
  });
```

⚠️ Este teste passa com a implementação correta — ele não está aqui para pegar um defeito, e sim para
que a próxima pessoa que pensar em "simplificar" a regex encontre o motivo escrito.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/shared/pipes/object-id.pipe.ts src/shared/pipes/object-id.pipe.spec.ts
npx eslint src/shared/pipes/object-id.pipe.ts src/shared/pipes/object-id.pipe.spec.ts
git add src/shared/pipes/object-id.pipe.ts src/shared/pipes/object-id.pipe.spec.ts
git commit -m "$(cat <<'EOF'
feat(shared): ObjectIdPipe, pra fechar injecao de caminho nos proxies

Medido: o Express casa ..%2F..%2F como UM segmento (200) e entrega o valor
DECODIFICADO. Como getFullURL so concatena, um simuladoId hostil faz a api
chamar qualquer rota do ms -- com a posicao de rede dela, inclusive rotas
expostas atras de OUTRAS permissoes.

Allowlist (24 hex), nao lista de proibidos: %252F sobrevive a uma rodada
de decodificacao e a lista nunca acaba. O formato do id e fechado.

Em shared/ e nao no modulo do caderno pra que o cartao-resposta possa
adota-lo depois sem depender do caderno.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PrN5kdVC3BqJMYTGnEL9K7
EOF
)"
```

---

### Task 3: O proxy — service, controller e wiring

**Files:**
- Create: `src/modules/simulado/caderno/caderno-http.service.ts`
- Create: `src/modules/simulado/caderno/caderno-http.service.spec.ts`
- Create: `src/modules/simulado/caderno/caderno.controller.ts`
- Create: `src/modules/simulado/caderno/caderno.controller.spec.ts`
- Modify: `src/modules/simulado/simulado.module.ts`

Leia `src/modules/simulado/cartao-resposta/cartao-resposta.controller.ts` e
`cartao-resposta-http.service.ts` antes: este é o mesmo padrão, com três diferenças deliberadas
(pipe, `attachment`, `JwtAuthGuard`).

- [ ] **Step 1: Escrever os testes que falham**

`caderno-http.service.spec.ts`:

```ts
import { CadernoHttpService } from './caderno-http.service';

const montar = () => {
  const axios = {
    getBinary: jest.fn().mockResolvedValue({
      buffer: Buffer.from('ZIP'),
      contentType: 'application/zip',
      headers: { 'x-caderno-avisos': '3' },
    }),
  };
  const factory = { create: jest.fn().mockReturnValue(axios) };
  const env = { get: jest.fn().mockReturnValue('http://ms:3000') };
  return {
    service: new CadernoHttpService(factory as any, env as any),
    axios,
  };
};

describe('CadernoHttpService', () => {
  it('chama a rota do caderno no ms', async () => {
    const { service, axios } = montar();
    const r = await service.baixar('65ecc850a528b39d273e7900', false);
    expect(axios.getBinary).toHaveBeenCalledWith(
      'v1/caderno/65ecc850a528b39d273e7900',
    );
    expect(r.buffer).toEqual(Buffer.from('ZIP'));
    expect(r.avisos).toBe('3');
  });

  it('draft=true vira o literal ?draft=true', async () => {
    const { service, axios } = montar();
    await service.baixar('65ecc850a528b39d273e7900', true);
    expect(axios.getBinary).toHaveBeenCalledWith(
      'v1/caderno/65ecc850a528b39d273e7900?draft=true',
    );
  });

  it('sem avisos, devolve undefined em vez de string vazia', async () => {
    const { service, axios } = montar();
    axios.getBinary.mockResolvedValue({
      buffer: Buffer.from('ZIP'),
      contentType: 'application/zip',
      headers: {},
    });
    const r = await service.baixar('65ecc850a528b39d273e7900', false);
    expect(r.avisos).toBeUndefined();
  });
});
```

`caderno.controller.spec.ts`:

```ts
import { CadernoController } from './caderno.controller';

const montar = (retorno: any = {}) => {
  const service = {
    baixar: jest.fn().mockResolvedValue({
      buffer: Buffer.from('ZIP'),
      contentType: 'application/zip',
      avisos: '3',
      ...retorno,
    }),
  };
  const res: any = { setHeader: jest.fn(), send: jest.fn() };
  return { controller: new CadernoController(service as any), service, res };
};

describe('CadernoController', () => {
  it('envia o zip como anexo, com o nome do arquivo', async () => {
    // `attachment`, não `inline`: zip não se abre no navegador.
    const { controller, res } = montar();
    await controller.baixar('65ecc850a528b39d273e7900', undefined, res);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/zip',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="caderno-65ecc850a528b39d273e7900.zip"',
    );
    expect(res.send).toHaveBeenCalledWith(Buffer.from('ZIP'));
  });

  it('repassa o X-Caderno-Avisos', async () => {
    const { controller, res } = montar();
    await controller.baixar('65ecc850a528b39d273e7900', undefined, res);
    expect(res.setHeader).toHaveBeenCalledWith('X-Caderno-Avisos', '3');
  });

  it('sem avisos, não seta o header', async () => {
    const { controller, res } = montar({ avisos: undefined });
    await controller.baixar('65ecc850a528b39d273e7900', undefined, res);
    const nomes = res.setHeader.mock.calls.map((c: any[]) => c[0]);
    expect(nomes).not.toContain('X-Caderno-Avisos');
  });

  it('só a string exata "true" liga o rascunho', async () => {
    // Query string chega como texto. Concatenar o valor cru injeta parâmetro
    // na chamada interna: medido, `draft=true&x=1` viraria
    // `?draft=true&x=1` na URL do ms.
    const { controller, service, res } = montar();
    for (const v of ['true', 'false', '1', '', 'TRUE', 'true&x=1']) {
      await controller.baixar('65ecc850a528b39d273e7900', v, res);
    }
    const draftsRecebidos = service.baixar.mock.calls.map((c: any[]) => c[1]);
    expect(draftsRecebidos).toEqual([true, false, false, false, false, false]);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx jest src/modules/simulado/caderno
```

Esperado: FAIL — módulos não encontrados.

- [ ] **Step 3: Implementar**

`caderno-http.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

@Injectable()
export class CadernoHttpService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }

  async baixar(
    simuladoId: string,
    draft: boolean,
  ): Promise<{ buffer: Buffer; contentType: string; avisos?: string }> {
    // ⚠️ O literal, não o valor recebido: concatenar o que veio na query
    // injeta parâmetro na chamada interna. O `simuladoId` já veio validado
    // pelo ObjectIdPipe.
    const rota = `v1/caderno/${simuladoId}${draft ? '?draft=true' : ''}`;
    const { buffer, contentType, headers } = await this.axios.getBinary(rota);
    // Minúsculas: é como o `getBinary` normaliza. Ver o docblock lá.
    return { buffer, contentType, avisos: headers['x-caderno-avisos'] };
  }
}
```

`caderno.controller.ts`:

```ts
import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { ObjectIdPipe } from 'src/shared/pipes/object-id.pipe';
import { CadernoHttpService } from './caderno-http.service';

@ApiTags('Simulado - Caderno')
@Controller('mssimulado/caderno')
export class CadernoController {
  constructor(private readonly service: CadernoHttpService) {}

  @Get(':simuladoId')
  @ApiBearerAuth()
  @ApiQuery({ name: 'draft', required: false, enum: ['true'] })
  @ApiResponse({ status: 200, description: 'baixa o zip do caderno (LaTeX)' })
  @ApiResponse({ status: 409, description: 'simulado não está pronto' })
  // ⚠️ `JwtAuthGuard` junto, diferente do `baixarCartao`. O `PermissionsGuard`
  // verifica o JWT, mas devolve `false` quando não há token — e o Nest
  // traduz `false` para 403, não 401. Os outros endpoints do controller do
  // cartão já usam os dois; o `baixarCartao` é que é a exceção.
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.visualizarProvas)
  async baixar(
    @Param('simuladoId', ObjectIdPipe) simuladoId: string,
    @Query('draft') draft: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, contentType, avisos } = await this.service.baixar(
      simuladoId,
      draft === 'true',
    );

    res.setHeader('Content-Type', contentType || 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="caderno-${simuladoId}.zip"`,
    );
    if (avisos !== undefined) res.setHeader('X-Caderno-Avisos', avisos);

    res.send(buffer);
  }
}
```

⚠️ `attachment`, não `inline` — o cartão usa `inline` porque PDF abre no navegador; zip não.

Em `simulado.module.ts`, acrescente `CadernoController` aos `controllers` e `CadernoHttpService` aos
`providers`, ao lado dos do cartão.

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx jest src/modules/simulado
npx tsc --noEmit -p tsconfig.json
```

Esperado: tudo verde, sem erro de tipo. **A suíte do cartão continua intacta.**

- [ ] **Step 5: Provar que três decisões mordem**

| Mutação | Teste que precisa ficar vermelho |
|---|---|
| `attachment` → `inline` | `envia o zip como anexo` |
| `draft === 'true'` → `!!draft` | `só a string exata "true" liga o rascunho` |
| setar o header mesmo com `avisos` undefined | `sem avisos, não seta o header` |

⚠️ Tirar o `ObjectIdPipe` do `@Param` **não** quebra teste unitário — o pipe só roda no pipeline HTTP
do Nest, e o spec chama o método direto. Quem cobre isso é o e2e da Task 4. **Confirme e reporte**,
não escreva teste unitário para isso.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/modules/simulado/caderno/*.ts src/modules/simulado/simulado.module.ts
npx eslint src/modules/simulado/caderno/caderno.controller.ts src/modules/simulado/caderno/caderno.controller.spec.ts src/modules/simulado/caderno/caderno-http.service.ts src/modules/simulado/caderno/caderno-http.service.spec.ts src/modules/simulado/simulado.module.ts
git add src/modules/simulado/caderno/ src/modules/simulado/simulado.module.ts
git commit -m "$(cat <<'EOF'
feat(caderno): proxy GET mssimulado/caderno/:simuladoId

Clone do proxy do cartao-resposta, com tres diferencas deliberadas:

- attachment, nao inline: zip nao abre no navegador.
- ObjectIdPipe no param, pra fechar a injecao de caminho.
- JwtAuthGuard junto do PermissionsGuard: sozinho, o guard devolve false
  e o Nest traduz pra 403, mas requisicao sem token deve dar 401. Os
  outros endpoints do controller do cartao ja fazem assim; o baixarCartao
  e a excecao.

So a string exata "true" liga o rascunho, e o literal e concatenado --
nao o valor recebido, que injetaria parametro na chamada interna.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PrN5kdVC3BqJMYTGnEL9K7
EOF
)"
```

---

### Task 4: E2E - 200, 401, 403, 409 e a injecao fechada

**Files:**
- Create: `test/caderno.e2e-spec.ts`

Seria o **primeiro e2e do modulo de simulado** - o cartao so tem unitario. A infra existe: 13 specs,
`createNestAppTest` e `overrideProvider` sao o padrao da casa.

Leia `test/course-period.e2e-spec.ts` inteiro antes de comecar, e reaproveite os fakers e o jeito de
criar usuario/role/token. **Nao invente um caminho novo.**

- [ ] **Step 1: Entender como o app de teste difere de producao**

⚠️ **`createNestAppTest` NAO registra o `ControllerExceptionsFilter`.** O `main.ts` faz
`app.useGlobalFilters(new ControllerExceptionsFilter())`; o helper de teste, nao.

Isso importa para este e2e em particular: o teste do 409 existe para provar que a mensagem chega
legivel, e e **o filtro** que monta o corpo final. Sem registra-lo, o teste exercita uma serializacao
diferente da de producao e prova menos do que aparenta.

Registre o filtro **neste e2e**:

```ts
app.useGlobalFilters(new ControllerExceptionsFilter());
```

⚠️ **Nao** mude o `createNestAppTest`: os outros 13 e2e passam hoje sem o filtro, e mudar o helper
mudaria o corpo de erro deles todos de uma vez. Se voce achar que o helper deveria registra-lo,
**reporte** - e decisao separada.

- [ ] **Step 2: Escrever o e2e**

`test/caderno.e2e-spec.ts`. Esqueleto - complete o setup de usuario/role seguindo
`course-period.e2e-spec.ts`:

```ts
const ID = '65ecc850a528b39d273e7900';

describe('Caderno (e2e)', () => {
  // ... setup no padrao da casa: app, userService, jwtService, roleService

  // O ms nao sobe no e2e: forjamos o service que fala com ele.
  const cadernoHttpMock = { baixar: jest.fn() };

  // no createTestingModule:
  //   .overrideProvider(CadernoHttpService).useValue(cadernoHttpMock)
  // e depois de criar o app:
  //   app.useGlobalFilters(new ControllerExceptionsFilter());

  it('200: devolve o zip com os headers', async () => {
    cadernoHttpMock.baixar.mockResolvedValue({
      buffer: Buffer.from('PKfake-zip'),
      contentType: 'application/zip',
      avisos: '3',
    });

    const r = await request(app.getHttpServer())
      .get(`/mssimulado/caderno/${ID}`)
      .set({ Authorization: `Bearer ${tokenComPermissao}` });

    expect(r.status).toBe(200);
    expect(r.headers['content-disposition']).toBe(
      `attachment; filename="caderno-${ID}.zip"`,
    );
    expect(r.headers['x-caderno-avisos']).toBe('3');
    expect(Buffer.from(r.body)).toEqual(Buffer.from('PKfake-zip'));
  });

  it('200: repassa o ?draft=true', async () => {
    cadernoHttpMock.baixar.mockResolvedValue({
      buffer: Buffer.from('ZIP'),
      contentType: 'application/zip',
    });
    await request(app.getHttpServer())
      .get(`/mssimulado/caderno/${ID}?draft=true`)
      .set({ Authorization: `Bearer ${tokenComPermissao}` });
    expect(cadernoHttpMock.baixar).toHaveBeenCalledWith(ID, true);
  });

  it('401: sem JWT', async () => {
    // ⚠️ E por isto que o endpoint usa JwtAuthGuard junto: so com o
    // PermissionsGuard, o Nest traduziria a recusa para 403.
    const r = await request(app.getHttpServer()).get(`/mssimulado/caderno/${ID}`);
    expect(r.status).toBe(401);
  });

  it('403: JWT valido, sem visualizarProvas', async () => {
    const r = await request(app.getHttpServer())
      .get(`/mssimulado/caderno/${ID}`)
      .set({ Authorization: `Bearer ${tokenSemPermissao}` });
    expect(r.status).toBe(403);
  });

  it('409: a mensagem do ms chega LEGIVEL', async () => {
    // O teste que justifica a Task 1. Antes dela, o corpo saia com 81 chaves
    // comecando em "0","1","2" e a mensagem virava
    // {"type":"Buffer","data":[...]}.
    cadernoHttpMock.baixar.mockRejectedValue(
      new HttpException(
        { message: 'simulado nao esta pronto (questoes pendentes ou incompletas)' },
        409,
      ),
    );

    const r = await request(app.getHttpServer())
      .get(`/mssimulado/caderno/${ID}`)
      .set({ Authorization: `Bearer ${tokenComPermissao}` });

    expect(r.status).toBe(409);
    expect(r.body.message).toContain('nao esta pronto');
    // Nenhuma chave numerica: e a assinatura do Buffer espalhado.
    expect(Object.keys(r.body).filter((k) => /^\d+$/.test(k))).toEqual([]);
  });

  it('400: simuladoId que sairia do caminho, sem tocar no ms', async () => {
    // ⚠️ MEDIDO: o Express casa `..%2F..%2F` como UM segmento e entrega o
    // valor decodificado. Sem o pipe, a api chamaria
    // http://ms-simulado:3000/v1/simulado/outro.
    cadernoHttpMock.baixar.mockClear();
    const r = await request(app.getHttpServer())
      .get('/mssimulado/caderno/..%2F..%2Fv1%2Fsimulado%2Foutro')
      .set({ Authorization: `Bearer ${tokenComPermissao}` });

    expect(r.status).toBe(400);
    expect(cadernoHttpMock.baixar).not.toHaveBeenCalled();
  });
});
```

⚠️ O mock rejeita com `HttpException`, nao com um erro do axios: o desembrulho do Buffer e
responsabilidade da factory, e ela ja tem teste proprio na Task 1. O que este e2e prova e o **resto do
caminho** - filtro, status, corpo.

- [ ] **Step 3: Rodar**

```bash
npm run test:local -- caderno
```

⚠️ Precisa de MySQL na 3307. Se nao houver, `npm test` sobe o Docker. **Se nenhum dos dois subir,
pare e reporte** - nao desative o e2e nem o marque como `skip`.

- [ ] **Step 4: Provar que o e2e morde (corrigido depois de medir)**

⚠️ A versão anterior deste passo dizia que remover o `useGlobalFilters` deixaria o teste do 409
vermelho. **Medido: não deixa.** Para um corpo já desembrulhado em `{ message }`, o handler padrão do
Nest serializa igual ao filtro. Quem evita o defeito é o `desembrulharCorpo`, não o filtro.

As duas provas que valem:

1. **Comente a chamada a `desembrulharCorpo` no `handleError`** (na factory) → o teste do 409 tem que
   ficar vermelho **com as chaves numéricas**, reproduzindo o defeito original ponta a ponta.
   Restaure.
2. **Tire o `ObjectIdPipe` do `@Param`** no controller → o teste do `400` fica vermelho. Restaure.

O `useGlobalFilters` **fica** no spec, mesmo não sendo o que salva este caso: sem ele o e2e testaria
uma serialização diferente da de produção em outros cenários — o 409 de categoria em uso, por
exemplo, carrega chaves extras (`simuladosUsando`) que só o filtro espalha.

- [ ] **Step 5: Commit**

```bash
npx prettier --write test/caderno.e2e-spec.ts
npx eslint test/caderno.e2e-spec.ts
git add test/caderno.e2e-spec.ts
git commit -m "$(cat <<'EOF'
test(caderno): e2e do proxy -- 200, 401, 403, 409 e injecao fechada

Primeiro e2e do modulo de simulado; o cartao so tem unitario.

Registra o ControllerExceptionsFilter neste spec: o createNestAppTest NAO
o registra, e e o filtro que monta o corpo de erro em producao. Sem ele o
teste do 409 exercitaria outra serializacao e passaria mesmo com o defeito
do Buffer presente.

Nao mexe no createNestAppTest: os outros 13 e2e passam hoje sem o filtro,
e mudar o helper mudaria o corpo de erro de todos de uma vez.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PrN5kdVC3BqJMYTGnEL9K7
EOF
)"
```

---

### Task 5: Gate manual - **PARA e espera o usuario**

Menor que os gates anteriores: nao ha LaTeX para compilar, e sim o caminho HTTP completo.

- [ ] **Step 1: Subir os dois servicos**

O `ms-simulado` na branch `poc/caderno-overleaf`, e a api nesta branch, com `SIMULADO_URL` apontando
para ele.

⚠️ Se algum dos dois nao subir, **pare e reporte** com o erro. Nao simule o gate com mock: o ponto
dele e justamente o caminho real entre os dois servicos.

- [ ] **Step 2: Os quatro comandos**

```bash
TOKEN=<jwt de um usuario com visualizar_provas>
API=http://localhost:3333
ID=<simuladoId desbloqueado>

# 1. o caminho feliz
curl -si -H "Authorization: Bearer $TOKEN" "$API/mssimulado/caderno/$ID" -o caderno.zip -D headers.txt
grep -iE 'content-disposition|x-caderno-avisos|content-type' headers.txt
unzip -l caderno.zip

# 2. o 409 legivel - use um simulado BLOQUEADO
curl -s -H "Authorization: Bearer $TOKEN" "$API/mssimulado/caderno/<id-bloqueado>" | head -c 300

# 3. sem token
curl -s -o /dev/null -w '%{http_code}\n' "$API/mssimulado/caderno/$ID"

# 4. a injecao
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $TOKEN" \
  "$API/mssimulado/caderno/..%2F..%2Fv1%2Fsimulado%2F$ID"
```

Esperado: `attachment` e o zip abrindo; o 409 com a frase legivel; `401`; `400`.

- [ ] **Step 3: PARE**

Reporte ao usuario as quatro saidas, e diga explicitamente se o zip do proxy e **byte-identico** ao
que o ms entrega (compare o `sha256` dos dois).

**Nao prossiga sem a resposta.**

---

### Task 6: Fechar

- [ ] **Step 1: Suite e tipos**

```bash
npx jest src/shared src/modules/simulado
npx tsc --noEmit -p tsconfig.json
```

- [ ] **Step 2: A suite do cartao, sem alteracao**

```bash
git diff poc/caderno-overleaf..HEAD --stat -- src/modules/simulado/cartao-resposta
```

Esperado: **nada**. Se houver mudanca, reporte - era o criterio de zero regressao da Task 1.

- [ ] **Step 3: Cobertura dos arquivos novos**

```bash
npx jest --coverage --collectCoverageFrom='shared/pipes/**/*.ts' --collectCoverageFrom='modules/simulado/caderno/**/*.ts' src/
```

Esperado: >= 90% em statements. Abaixo, acrescente teste - nunca `istanbul ignore`.

- [ ] **Step 4: Build**

```bash
yarn build
```

- [ ] **Step 5: Abrir o PR contra a POC**

```bash
git push -u origin poc/caderno-overleaf
git push -u origin feature/caderno-05-proxy-api
gh pr create --base poc/caderno-overleaf --title "[Caderno - Overleaf] Card 05 - proxy, e o transporte binario consertado"
```

⚠️ A `poc/caderno-overleaf` e **nova neste repo** e precisa ser empurrada antes, senao o `--base`
nao existe no remoto.

O corpo precisa cobrir: os tres defeitos medidos e qual deles este card fecha; por que a correcao foi
na factory compartilhada; a diferenca do `JwtAuthGuard`; a injecao de caminho e por que allowlist; o
que ficou registrado e nao feito (o `baixarCartao` e o escopo de cursinho).

---

## O que este card NAO faz

**Nao corrige o `baixarCartao`.** Ele tem a mesma injecao de caminho, hoje, em producao - e o
`ObjectIdPipe` desta task esta a uma linha de distancia. Nao entra porque trocar um `404` por um `400`
num endpoint em producao e mudanca de contrato, e este card ja deixou de ser aditivo ao mexer na
factory. Fica **registrado com prioridade**.

**Nao endurece o `ControllerExceptionsFilter`.** O `isPlainObject` dele e fragil para qualquer objeto
nao-puro. Corrigir o `handleError` remove o unico produtor conhecido, e o filtro e
`/* istanbul ignore file */` - mexer nele sem cobertura seria trocar um defeito conhecido por um
alterado as cegas.

**Nao escopa por cursinho.** Decisao do usuario: o caderno segue o cartao. Escopar so o caderno
produziria o absurdo de negar o caderno e liberar o cartao do mesmo simulado.
