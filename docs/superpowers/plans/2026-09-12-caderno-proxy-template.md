# Caderno — Card 12: proxy do template na api Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expor pelo `api-vcnafacul` os oito endpoints de template do ms-simulado, para o card 13 ter o que chamar.

**Architecture:** Proxy 1:1, sem regra de negócio nova. Dois arquivos novos no submódulo `simulado/caderno/` que o card 05 já criou. A única parte sem precedente no repo é o reenvio de multipart, e ela ganha uma task só para si.

**Tech Stack:** NestJS 10, TypeORM, axios. **Nenhuma dependência nova** — `FormData` e `Blob` são nativos do Node 20.

**Spec:** `docs/superpowers/specs/2026-09-12-caderno-proxy-template-design.md`

---

## Contexto que o plano assume

No **ms-simulado**, os cards 10 (mergeado) e 11 (PR aberto) entregaram oito endpoints sob
`v1/caderno/template`. Este card os expõe pela api. Nenhuma lógica é reimplementada aqui.

⚠️ **O card 11 ainda não está mergeado** (`ms#184`, segurado de propósito até o card 13). Isso não
bloqueia: os dois repos são independentes, e o deploy é em lockstep ms → api → client.

## A decisão de permissão

**`alterarPermissao`, reusada.** Sem permissão nova, sem migration, sem `RolesLabel`, sem SQL de
concessão. Decidido pelo dono, contra o que o card propunha; a spec registra o que isso fecha e qual é
a saída.

## O contrato do ms, medido no código

| método | rota no ms | corpo / query |
|---|---|---|
| `GET` | `v1/caderno/template` | — |
| `GET` | `v1/caderno/template/rascunho` | — (404 se não houver) |
| `POST` | `v1/caderno/template/rascunho` | **multipart**: `arquivo` + `criadorId` + `notas?` |
| `DELETE` | `v1/caderno/template/rascunho` | — |
| `POST` | `v1/caderno/template/rascunho/publicar` | — |
| `GET` | `v1/caderno/template/versoes` | — |
| `POST` | `v1/caderno/template/versoes/:n/restaurar` | JSON: `{ criadorId, notas? }` |
| `GET` | `v1/caderno/template/teste` | `?versao=N` · `?rascunho=1` — **binário** |

⚠️ **`criadorId` é campo interno, injetado pela api a partir do JWT.** Não vem do cliente. É o padrão
já estabelecido em `prova/dtos/create.dto.input.ts:44`, e o ms o exige em dois endpoints.

## O que já foi verificado (não re-verifique)

| | |
|---|---|
| o submódulo existe | `src/modules/simulado/caderno/` (card 05) |
| `getBinary` | no `HttpServiceAxiosFactory`, normaliza headers em minúsculas |
| corpo de erro íntegro | `desembrulharCorpo` + `handleError` → `HttpException(errorData, status)` |
| body parser | `main.ts` já usa `30mb` |
| `AuditLogService` | existe, exportado, e já injetado em `simulado.service` e `questao.service` |
| upload multipart repassado ao ms | **não existe precedente** — este é o primeiro |
| `form-data` | **ausente** das dependências, e não vamos adicioná-la |
| `FormData`/`Blob` nativos | ✅ Node 20.19.6 local; CI usa `node-version: 20.x` |

## Restrições do repo

- ⚠️ **Nunca** `yarn lint` nem `eslint <diretório>` — sempre caminhos de arquivo explícitos.
- ⚠️ **Nunca** `git add -A` nem `git add .`.
- ⚠️ **Não rode `yarn install`.** Um `yarn install` neste repo já reescreveu ~780 linhas do `yarn.lock` com versões sem relação nenhuma com a mudança. Se achar que falta pacote, **pare e pergunte**.
- Testes: `npx jest <caminho>` para unitário. O e2e é `npm run test` (sobe MySQL no Docker) ou `npm run test:local` (exige MySQL na 3307).
- Branch `feature/caderno-12-proxy-template`, já criada, **de `develop`**. Commits autônomos liberados.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/modules/simulado/caderno/caderno-template-http.service.ts` | o cliente do ms: 7 chamadas JSON + 1 binária + o multipart |
| `src/modules/simulado/caderno/caderno-template-http.service.spec.ts` | |
| `src/modules/simulado/caderno/caderno-template.controller.ts` | as 8 rotas, guards, validação de query, audit |
| `src/modules/simulado/caderno/caderno-template.controller.spec.ts` | |
| `src/modules/simulado/simulado.module.ts` | registrar controller e service |
| `test/caderno-template.e2e-spec.ts` | 401/403/409-com-lista/binário |

---

### Task 1: o cliente do ms — tudo menos o upload

**Files:**
- Create: `src/modules/simulado/caderno/caderno-template-http.service.ts`
- Create: `src/modules/simulado/caderno/caderno-template-http.service.spec.ts`

O molde é o `caderno-http.service.ts` do card 05, que está ao lado. Leia-o antes.

O upload fica para a Task 2 — ele é o único método sem precedente e merece isolamento.

- [ ] **Step 1: Escrever o teste que falha**

`caderno-template-http.service.spec.ts`, no molde do `caderno-http.service.spec.ts`:

```ts
import { CadernoTemplateHttpService } from './caderno-template-http.service';

const montar = () => {
  const axios = {
    get: jest.fn().mockResolvedValue({ versao: 3 }),
    post: jest.fn().mockResolvedValue({ versao: 4 }),
    delete: jest.fn().mockResolvedValue(undefined),
    getBinary: jest.fn().mockResolvedValue({
      buffer: Buffer.from('ZIP'),
      contentType: 'application/zip',
      headers: {},
    }),
  };
  const factory = { create: jest.fn().mockReturnValue(axios) };
  const env = { get: jest.fn().mockReturnValue('http://ms:3000') };
  return {
    service: new CadernoTemplateHttpService(factory as any, env as any),
    axios,
  };
};

describe('as rotas simples', () => {
  it.each([
    ['publicada', [], 'get', 'v1/caderno/template'],
    ['rascunho', [], 'get', 'v1/caderno/template/rascunho'],
    ['versoes', [], 'get', 'v1/caderno/template/versoes'],
    ['descartarRascunho', [], 'delete', 'v1/caderno/template/rascunho'],
    ['publicar', [], 'post', 'v1/caderno/template/rascunho/publicar'],
  ])('%s bate em %s %s', async (metodo, args, verbo, rota) => {
    const { service, axios } = montar();
    await (service as any)[metodo](...args);
    // Só o caminho: o segundo argumento varia por método e não é o assunto.
    expect(axios[verbo].mock.calls[0][0]).toBe(rota);
  });
});

describe('restaurar', () => {
  it('manda o criadorId do JWT no corpo, e o número na rota', async () => {
    // ⚠️ `criadorId` é campo INTERNO: o ms o exige e ele vem do JWT, nunca do
    // cliente. É o padrão de prova/dtos/create.dto.input.ts:44.
    const { service, axios } = montar();
    await service.restaurar(2, 'user-1', 'voltando a v2');

    const [rota, corpo] = axios.post.mock.calls[0];
    expect(rota).toBe('v1/caderno/template/versoes/2/restaurar');
    expect(corpo).toEqual({ criadorId: 'user-1', notas: 'voltando a v2' });
  });

  it('o número entra reserializado, não concatenado como texto', async () => {
    // ⚠️ O card 05 já deixou escrito: concatenar valor de query ou de path na
    // chamada ao ms é injeção de parâmetro. O controller valida, e aqui o
    // tipo é `number` — se algum dia chegar string, o TS acusa.
    const { service, axios } = montar();
    await service.restaurar(7, 'u', undefined);
    expect(axios.post.mock.calls[0][0]).toBe(
      'v1/caderno/template/versoes/7/restaurar',
    );
  });
});

describe('zipDeTeste', () => {
  it('sem opção nenhuma, chama a rota nua', async () => {
    const { service, axios } = montar();
    await service.zipDeTeste({});
    expect(axios.getBinary).toHaveBeenCalledWith('v1/caderno/template/teste');
  });

  it('versao vira ?versao=N', async () => {
    const { service, axios } = montar();
    await service.zipDeTeste({ versao: 3 });
    expect(axios.getBinary).toHaveBeenCalledWith(
      'v1/caderno/template/teste?versao=3',
    );
  });

  it('rascunho vira o LITERAL ?rascunho=1', async () => {
    // ⚠️ Literal, nunca o valor recebido. Quem interpreta o que o cliente
    // mandou é o controller; aqui já chega decidido.
    const { service, axios } = montar();
    await service.zipDeTeste({ rascunho: true });
    expect(axios.getBinary).toHaveBeenCalledWith(
      'v1/caderno/template/teste?rascunho=1',
    );
  });

  it('devolve o buffer e o content-type do ms', async () => {
    const { service } = montar();
    const r = await service.zipDeTeste({});
    expect(r.buffer).toEqual(Buffer.from('ZIP'));
    expect(r.contentType).toBe('application/zip');
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npx jest src/modules/simulado/caderno/caderno-template-http.service.spec.ts
```

Esperado: FAIL — `Cannot find module './caderno-template-http.service'`.

- [ ] **Step 3: Implementar**

`caderno-template-http.service.ts`, com o construtor idêntico ao do `CadernoHttpService`:

```ts
@Injectable()
export class CadernoTemplateHttpService {
  private readonly axios: HttpServiceAxios;

  constructor(
    private readonly httpServiceFactory: HttpServiceAxiosFactory,
    private readonly envService: EnvService,
  ) {
    this.axios = this.httpServiceFactory.create(
      this.envService.get('SIMULADO_URL'),
    );
  }
  // …
}
```

Os métodos: `publicada()`, `rascunho()`, `versoes()`, `descartarRascunho()`, `publicar()`,
`restaurar(versao: number, criadorId: string, notas?: string)`, e
`zipDeTeste(opts: { versao?: number; rascunho?: boolean })`.

⚠️ **`zipDeTeste` monta a query a partir de tipos, não de strings.** `versao` é `number` e
`rascunho` é `boolean` — a interpretação do que o cliente mandou é do controller. Assim o serviço não
tem como concatenar texto do usuário na rota, por construção, e não por disciplina.

- [ ] **Step 4: Rodar e confirmar que passa**

```bash
npx jest src/modules/simulado/caderno/caderno-template-http.service.spec.ts
```

- [ ] **Step 5: Provar que duas decisões mordem**

| Mutação | Teste vermelho |
|---|---|
| `zipDeTeste` interpolar `rascunho` em vez do literal (`?rascunho=${rascunho}`) | `rascunho vira o LITERAL ?rascunho=1` |
| `restaurar` mandar `notas` sem `criadorId` | `manda o criadorId do JWT no corpo` |

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/modules/simulado/caderno/caderno-template-http.service.ts src/modules/simulado/caderno/caderno-template-http.service.spec.ts
npx eslint src/modules/simulado/caderno/caderno-template-http.service.ts src/modules/simulado/caderno/caderno-template-http.service.spec.ts
git add src/modules/simulado/caderno/caderno-template-http.service.ts src/modules/simulado/caderno/caderno-template-http.service.spec.ts
git commit -m "$(cat <<'EOF'
feat(caderno): cliente do ms para os endpoints de template

Sete das oito chamadas -- o upload multipart vem separado, por ser o
unico caso sem precedente no repo.

zipDeTeste recebe `versao: number` e `rascunho: boolean`, nao strings:
quem interpreta o que o cliente mandou e o controller. Assim o servico
nao tem como concatenar texto do usuario na rota interna por
construcao, e nao por disciplina. O card 05 ja deixou escrito que isso
e injecao de parametro.

criadorId vai no corpo do restaurar, vindo do JWT -- campo interno que
o ms exige, mesmo padrao de prova/dtos/create.dto.input.ts:44.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: o upload multipart — o primeiro do repo

**Files:**
- Modify: `src/modules/simulado/caderno/caderno-template-http.service.ts`
- Modify: `src/modules/simulado/caderno/caderno-template-http.service.spec.ts`

Task própria porque **não há padrão local para copiar**. O card afirma que segue "o mesmo padrão do
upload de cartão escaneado" — medido, e é falso: aquele grava no R2 pelo `BlobService` e nunca
reenvia multipart. Em toda a api este é o primeiro caso.

E o modo de falha é traiçoeiro: um `Content-Type` explícito atropela o boundary que o axios gera, o ms
recebe um corpo que não consegue parsear, e **parece defeito do ms**.

- [ ] **Step 1: Escrever o teste que falha**

```ts
describe('subirRascunho — o multipart', () => {
  const arquivo = {
    buffer: Buffer.from('PKconteudo-do-zip'),
    originalname: 'projeto.zip',
    mimetype: 'application/zip',
  } as Express.Multer.File;

  it('manda um FormData, e o axios monta o boundary', async () => {
    const { service, axios } = montar();
    await service.subirRascunho(arquivo, 'user-1', 'capa nova');

    const [rota, corpo, headers] = axios.post.mock.calls[0];
    expect(rota).toBe('v1/caderno/template/rascunho');
    expect(corpo).toBeInstanceOf(FormData);

    // ⚠️ NENHUM Content-Type explícito. O boundary é gerado pelo axios a
    // partir do FormData; passar o header aqui o substitui por um sem
    // boundary, e o ms recebe um corpo que não parseia. A falha aparece
    // como erro do ms, não daqui.
    expect(headers).toBeUndefined();
  });

  it('o FormData carrega o arquivo, o criadorId e as notas', async () => {
    const { service, axios } = montar();
    await service.subirRascunho(arquivo, 'user-1', 'capa nova');

    const corpo = axios.post.mock.calls[0][1] as FormData;
    expect(corpo.get('criadorId')).toBe('user-1');
    expect(corpo.get('notas')).toBe('capa nova');

    const enviado = corpo.get('arquivo') as Blob;
    expect(enviado).toBeInstanceOf(Blob);
    expect(Buffer.from(await enviado.arrayBuffer())).toEqual(arquivo.buffer);
  });

  it('o nome do campo é `arquivo` — o que o ms espera', async () => {
    // ⚠️ O ms usa FileInterceptor('arquivo'). Um nome diferente faz o
    // arquivo simplesmente não chegar, e o ms responde 400 "sem arquivo" —
    // mensagem que manda procurar no lugar errado.
    const { service, axios } = montar();
    await service.subirRascunho(arquivo, 'u', undefined);
    const corpo = axios.post.mock.calls[0][1] as FormData;
    expect([...corpo.keys()]).toContain('arquivo');
  });

  it('sem notas, não manda o campo vazio', async () => {
    const { service, axios } = montar();
    await service.subirRascunho(arquivo, 'u', undefined);
    const corpo = axios.post.mock.calls[0][1] as FormData;
    expect(corpo.has('notas')).toBe(false);
  });

  it('preserva o nome do arquivo original', async () => {
    const { service, axios } = montar();
    await service.subirRascunho(arquivo, 'u', undefined);
    const corpo = axios.post.mock.calls[0][1] as FormData;
    expect((corpo.get('arquivo') as File).name).toBe('projeto.zip');
  });
});
```

- [ ] **Step 2: Rodar, confirmar que falha, implementar**

```ts
  async subirRascunho(
    arquivo: Express.Multer.File,
    criadorId: string,
    notas?: string,
  ): Promise<RespostaDoRascunho> {
    const corpo = new FormData();
    corpo.append(
      'arquivo',
      new Blob([arquivo.buffer], { type: arquivo.mimetype }),
      arquivo.originalname,
    );
    corpo.append('criadorId', criadorId);
    if (notas !== undefined) corpo.append('notas', notas);

    // ⚠️ Sem headers. Ver o teste `manda um FormData, e o axios monta o
    // boundary`.
    return this.axios.post('v1/caderno/template/rascunho', corpo);
  }
```

- [ ] **Step 3: PROVAR QUE O MULTIPART É PARSEÁVEL DE VERDADE**

Os testes acima provam a **forma** do que sai. Não provam que um servidor consegue ler.

Escreva um teste que faz a volta completa, **sem rede**: passe o `FormData` para `new Request(...)` (ou
`new Response(...)`) do próprio Node e leia de volta com `.formData()`. É o mesmo parser que qualquer
servidor usaria.

```ts
  it('o multipart montado é PARSEÁVEL, não só bem-formado na aparência', async () => {
    // ⚠️ Os outros testes olham o objeto que sai daqui. Este prova que um
    // parser do outro lado consegue ler — que é a pergunta que importa, e a
    // única que distingue "montei um FormData" de "o ms vai conseguir abrir".
    const { service, axios } = montar();
    await service.subirRascunho(arquivo, 'user-1', 'capa nova');
    const corpo = axios.post.mock.calls[0][1] as FormData;

    const devolta = await new Response(corpo).formData();

    expect(devolta.get('criadorId')).toBe('user-1');
    const lido = devolta.get('arquivo') as File;
    expect(Buffer.from(await lido.arrayBuffer())).toEqual(arquivo.buffer);
  });
```

⚠️ Se `new Response(formData).formData()` não estiver disponível no runtime do jest, **reporte** em vez
de apagar o teste. Alternativas nessa ordem: `new Request('http://x', { method: 'POST', body: corpo })`,
ou `undici`. **Não** troque por um teste que só olhe o objeto — isso é o que os outros quatro já fazem.

- [ ] **Step 4: Provar que as decisões mordem**

| Mutação | Teste vermelho |
|---|---|
| passar `{ 'Content-Type': 'multipart/form-data' }` como headers | `manda um FormData, e o axios monta o boundary` |
| trocar o nome do campo de `arquivo` para `file` | `o nome do campo é arquivo` |
| `corpo.append('notas', notas ?? '')` | `sem notas, não manda o campo vazio` |
| mandar `arquivo.buffer` cru em vez de `Blob` | `o multipart montado é PARSEÁVEL` |

⚠️ A última é a que interessa: ela é a diferença entre um corpo que o ms abre e um que ele recusa.

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/modules/simulado/caderno/caderno-template-http.service.ts src/modules/simulado/caderno/caderno-template-http.service.spec.ts
npx eslint src/modules/simulado/caderno/caderno-template-http.service.ts src/modules/simulado/caderno/caderno-template-http.service.spec.ts
git add src/modules/simulado/caderno/caderno-template-http.service.ts src/modules/simulado/caderno/caderno-template-http.service.spec.ts
git commit -m "$(cat <<'EOF'
feat(caderno): reenviar o zip do Overleaf ao ms como multipart

Primeiro reenvio de multipart da api. O card dizia que seguia o padrao
do upload de cartao escaneado; nao segue -- aquele grava no R2 pelo
BlobService e nunca repassa adiante.

FormData e Blob nativos do Node 20, sem dependencia nova (form-data nao
esta no projeto e nao precisa estar).

NENHUM Content-Type explicito: o boundary e gerado pelo axios a partir
do FormData, e passar o header o substitui por um sem boundary. O ms
recebe um corpo que nao parseia, e a falha aparece como erro DELE.

O teste que importa nao olha o objeto que sai -- ele faz a volta por
Response#formData, o mesmo parser que um servidor usaria. E a unica
forma de distinguir "montei um FormData" de "o outro lado consegue
abrir".

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: o controller — oito rotas, guards, e o que não pode chegar cru no ms

**Files:**
- Create: `src/modules/simulado/caderno/caderno-template.controller.ts`
- Create: `src/modules/simulado/caderno/caderno-template.controller.spec.ts`

O molde é o `caderno.controller.ts` do card 05, ao lado. Leia-o antes — inclusive os comentários.

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { BadRequestException } from '@nestjs/common';
import { CadernoTemplateController } from './caderno-template.controller';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';

const usuario = { id: 'user-1' };
const req = () => ({ user: usuario }) as any;
const res = () => ({ setHeader: jest.fn(), send: jest.fn() }) as any;

function montar(over: Record<string, unknown> = {}) {
  const http = {
    publicada: jest.fn().mockResolvedValue({ versao: 3 }),
    rascunho: jest.fn().mockResolvedValue({ versao: 0 }),
    versoes: jest.fn().mockResolvedValue([]),
    descartarRascunho: jest.fn().mockResolvedValue(undefined),
    publicar: jest.fn().mockResolvedValue({ versao: 4 }),
    restaurar: jest.fn().mockResolvedValue(undefined),
    subirRascunho: jest.fn().mockResolvedValue({ erros: [] }),
    zipDeTeste: jest.fn().mockResolvedValue({
      buffer: Buffer.from('ZIP'),
      contentType: 'application/zip',
    }),
    ...over,
  } as any;
  const audit = { create: jest.fn().mockResolvedValue(undefined) };
  return { http, audit, controller: new CadernoTemplateController(http, audit as any) };
}

describe('as rotas e os guards', () => {
  it('o controller vive sob mssimulado/caderno/template', () => {
    // ⚠️ O card 13 monta as chamadas em cima deste caminho. Divergir aqui
    // quebra um repo que ainda não existe, e o erro aparece só na integração.
    expect(Reflect.getMetadata('path', CadernoTemplateController)).toBe(
      'mssimulado/caderno/template',
    );
  });

  it.each([
    'publicada',
    'getRascunho',
    'subirRascunho',
    'descartarRascunho',
    'publicar',
    'versoes',
    'restaurar',
    'zipDeTeste',
  ])('%s exige alterarPermissao', (metodo) => {
    const permissao = Reflect.getMetadata(
      PermissionsGuard.name,
      CadernoTemplateController.prototype[metodo],
    );
    expect(permissao).toBe(Permissions.alterarPermissao);
  });
});

describe('os query params do /teste NÃO chegam crus no ms', () => {
  // ⚠️ A api repete a validação do ms de propósito. Se ela montasse o literal
  // sem interpretar, `?rascunho=xis` viraria "sim" em silêncio e o 400 do ms
  // nunca dispararia — o defeito que o ms existe para evitar, reintroduzido
  // uma camada acima. A spec tem a tabela.

  it('sem parâmetro, pede a publicada', async () => {
    const { http, controller } = montar();
    await controller.zipDeTeste(undefined, undefined, res());
    expect(http.zipDeTeste).toHaveBeenCalledWith({});
  });

  it('?versao=3 vira o NÚMERO 3', async () => {
    const { http, controller } = montar();
    await controller.zipDeTeste('3', undefined, res());
    expect(http.zipDeTeste).toHaveBeenCalledWith({ versao: 3 });
  });

  it.each(['1', 'true'])('?rascunho=%s vira booleano', async (valor) => {
    const { http, controller } = montar();
    await controller.zipDeTeste(undefined, valor, res());
    expect(http.zipDeTeste).toHaveBeenCalledWith({ rascunho: true });
  });

  it.each(['xis', 'false', '0', ''])(
    '?rascunho=%s → 400 SEM chamar o ms',
    async (valor) => {
      const { http, controller } = montar();
      await expect(
        controller.zipDeTeste(undefined, valor, res()),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(http.zipDeTeste).not.toHaveBeenCalled();
    },
  );

  it.each(['abc', '', '1.5', '-1'])(
    '?versao=%s → 400 SEM chamar o ms',
    async (valor) => {
      const { http, controller } = montar();
      await expect(
        controller.zipDeTeste(valor, undefined, res()),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(http.zipDeTeste).not.toHaveBeenCalled();
    },
  );

  it('os dois juntos → 400 SEM chamar o ms', async () => {
    const { http, controller } = montar();
    await expect(
      controller.zipDeTeste('3', '1', res()),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(http.zipDeTeste).not.toHaveBeenCalled();
  });
});

describe('o criadorId vem do JWT, nunca do cliente', () => {
  it('subirRascunho usa req.user.id', async () => {
    const { http, controller } = montar();
    const arquivo = { buffer: Buffer.from('z'), originalname: 'p.zip' } as any;
    await controller.subirRascunho(arquivo, { notas: 'x' } as any, req());
    expect(http.subirRascunho).toHaveBeenCalledWith(arquivo, 'user-1', 'x');
  });

  it('restaurar usa req.user.id', async () => {
    const { http, controller } = montar();
    await controller.restaurar(2, { notas: 'y' } as any, req());
    expect(http.restaurar).toHaveBeenCalledWith(2, 'user-1', 'y');
  });

  it('subirRascunho sem arquivo → 400, sem chamar o ms', async () => {
    const { http, controller } = montar();
    await expect(
      controller.subirRascunho(undefined as any, {} as any, req()),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(http.subirRascunho).not.toHaveBeenCalled();
  });
});

describe('a auditoria', () => {
  it('publicar grava DEPOIS do sucesso, com autor e versão', async () => {
    const { audit, controller } = montar();
    await controller.publicar(req());

    expect(audit.create).toHaveBeenCalledWith({
      entityType: 'caderno-template',
      entityId: '4',
      updatedBy: 'user-1',
      changes: { acao: 'publicar', versao: 4 },
    });
  });

  it('publicar que FALHA no ms não grava nada', async () => {
    // ⚠️ Um log de "publicou a v5" para uma publicação que o ms recusou com
    // 409 é pior que log nenhum: manda procurar uma versão que não existe.
    const { audit, controller } = montar({
      publicar: jest.fn().mockRejectedValue(new Error('409')),
    });
    await expect(controller.publicar(req())).rejects.toThrow();
    expect(audit.create).not.toHaveBeenCalled();
  });

  it('restaurar grava, com a versão de origem', async () => {
    const { audit, controller } = montar();
    await controller.restaurar(2, { notas: 'y' } as any, req());
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'caderno-template',
        entityId: '2',
        updatedBy: 'user-1',
        changes: { acao: 'restaurar', versao: 2, notas: 'y' },
      }),
    );
  });

  it('as rotas de LEITURA não gravam nada', async () => {
    const { audit, controller } = montar();
    await controller.publicada();
    await controller.versoes();
    await controller.zipDeTeste(undefined, undefined, res());
    expect(audit.create).not.toHaveBeenCalled();
  });
});

describe('o binário', () => {
  it('manda o zip com Content-Disposition', async () => {
    const { controller } = montar();
    const resposta = res();
    await controller.zipDeTeste(undefined, undefined, resposta);

    expect(resposta.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/zip',
    );
    const disposition = resposta.setHeader.mock.calls.find(
      ([nome]) => nome === 'Content-Disposition',
    );
    expect(disposition[1]).toContain('attachment');
    expect(resposta.send).toHaveBeenCalledWith(Buffer.from('ZIP'));
  });
});
```

- [ ] **Step 2: Rodar, confirmar que falha, implementar**

```bash
npx jest src/modules/simulado/caderno/caderno-template.controller.spec.ts
```

O controller: `@Controller('mssimulado/caderno/template')`, `@ApiTags('Simulado - Caderno')`, e em
**todas** as oito rotas:

```ts
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)
```

⚠️ **`JwtAuthGuard` junto, não só o `PermissionsGuard`.** O card 05 deixou o comentário: sem token, o
`PermissionsGuard` devolve `false`, e o Nest traduz `false` para **403**. Sem os dois, "sem token" e
"sem permissão" viram a mesma resposta, e quem está com a sessão expirada não é mandado para o login.

A interpretação dos query params, num helper privado, seguindo a tabela da spec:

| entrada | resultado |
|---|---|
| nada | `{}` |
| `?versao=` inteiro positivo | `{ versao: n }` |
| `?rascunho=1` ou `?rascunho=true` | `{ rascunho: true }` |
| `?rascunho=` outro valor | `BadRequestException` |
| `?versao=` não inteiro positivo | `BadRequestException` |
| os dois | `BadRequestException` |

O upload: `@UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 5 * 1024 * 1024 } }))`.

⚠️ **O limite do `FileInterceptor` é a trava que importa aqui.** O body parser global de 30 MB é
grande demais para proteger e nem se aplica a multipart; o limite do ms é a última linha, do outro
lado da rede.

O audit, em `publicar` e `restaurar`, **depois** do `await` que pode falhar.

- [ ] **Step 3: Rodar e confirmar que passa**

- [ ] **Step 4: Provar que as decisões mordem**

| Mutação | Teste vermelho |
|---|---|
| aceitar `?rascunho=` por presença (`!== undefined`) | os quatro casos de `?rascunho=%s → 400` |
| aceitar `?versao` com `parseInt` sem validar | `?versao=abc`, `''` e `1.5` |
| gravar o audit **antes** do `await` | `publicar que FALHA no ms não grava nada` |
| ler `criadorId` do corpo em vez do JWT | `subirRascunho usa req.user.id` |
| tirar o `JwtAuthGuard`, deixando só o `PermissionsGuard` | ⚠️ **nenhum aqui** — é o e2e da Task 4 que pega (401 vs 403) |

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/modules/simulado/caderno/caderno-template.controller.ts src/modules/simulado/caderno/caderno-template.controller.spec.ts
npx eslint src/modules/simulado/caderno/caderno-template.controller.ts src/modules/simulado/caderno/caderno-template.controller.spec.ts
git add src/modules/simulado/caderno/caderno-template.controller.ts src/modules/simulado/caderno/caderno-template.controller.spec.ts
git commit -m "$(cat <<'EOF'
feat(caderno): oito rotas de template na api, atras de alterarPermissao

Proxy 1:1, sem regra de negocio nova. A unica validacao repetida e a
dos query params do /teste, e ela e obrigatoria: montar a rota interna
sem interpretar o que veio seria injecao, e interpretar sem validar
faria ?rascunho=xis virar "sim" em silencio -- o 400 do ms nunca
dispararia porque a api nunca enviaria o valor estranho.

criadorId sai do JWT, nunca do corpo. O ms o exige como campo interno.

O audit de publicar e restaurar grava DEPOIS do sucesso: um log de
"publicou a v5" para uma publicacao que o ms recusou manda procurar uma
versao que nao existe.

JwtAuthGuard junto do PermissionsGuard -- sem token o PermissionsGuard
devolve false e o Nest traduz para 403, entao sem os dois "sem token" e
"sem permissao" viram a mesma resposta e quem tem sessao expirada nao e
mandado pro login.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: wiring e o e2e que prova a corrente inteira

**Files:**
- Modify: `src/modules/simulado/simulado.module.ts`
- Create: `test/caderno-template.e2e-spec.ts`

- [ ] **Step 1: Registrar no módulo**

Em `simulado.module.ts`, acrescentar `CadernoTemplateController` aos `controllers` e
`CadernoTemplateHttpService` aos `providers`, ao lado dos do card 05. E importar o `AuditLogModule`,
se ele ainda não estiver nos `imports`.

- [ ] **Step 2: Escrever o e2e**

`test/caderno-template.e2e-spec.ts`, no molde do `test/caderno.e2e-spec.ts`. Leia-o inteiro antes —
ele já resolve o setup de role, usuário e token.

⚠️ **Copie a técnica de forjar o axios, não o service.** O comentário do card 05 explica por quê:

> Forjamos o axios, não o `CadernoHttpService`: mockar o service tiraria a `HttpServiceAxiosFactory`
> inteira do caminho, e é justamente a composição `handleError` (desembrulharCorpo) →
> `ControllerExceptionsFilter` que este card conserta.

Aqui vale igual, e mais ainda: **o 409 com a lista de erros de lint é a feature**, e ela atravessa
exatamente essa corrente.

Os casos:

```ts
  it('401: sem JWT', …)

  it('403: JWT válido, sem alterarPermissao', …)

  it('403: com visualizarProvas e SEM alterarPermissao', …)
  // ⚠️ É o critério que o card chama de "o ponto do card": quem gera prova
  // não mexe no layout. A permissão mudou em relação ao card, a separação
  // não.

  it('409 do publicar: a LISTA de erros de lint chega no corpo', …)
  // ⚠️ O teste mais importante deste card. O ms responde
  // { message: [...], erros: [...] }; se o ControllerExceptionsFilter trocar
  // isso por "Conflito", a tela do card 13 fica sem ter o que mostrar e NADA
  // falha. Asserte o conteúdo da lista, não só o status 409.

  it('200 do POST /rascunho com lint sujo: { aceitos, ignorados, erros, avisos } íntegro', …)

  it('GET /teste: o zip chega byte-idêntico ao que o ms devolveu', …)

  it('400: ?rascunho=xis não alcança o ms', …)
```

- [ ] **Step 3: Rodar o e2e**

```bash
npm run test
```

⚠️ Ele sobe MySQL no Docker, roda as migrations e derruba no fim. Se o Docker não estiver disponível,
`npm run test:local` exige MySQL na porta 3307 — e se nenhum dos dois rodar, **reporte** em vez de
marcar o step como feito.

⚠️ **Dois testes deste repo já falham na `develop`, e não são seus:** `student-course.e2e-spec.ts`
(faker gera e-mail duplicado) e `inscription-course.e2e-spec.ts` (diferença de fuso/DST). Confirme que
são só esses dois antes de investigar qualquer coisa.

- [ ] **Step 4: Provar que o teste do 409 morde**

Faça o `desembrulharCorpo` devolver uma string genérica em vez do corpo do ms, e confirme que
`409 do publicar: a LISTA de erros de lint chega no corpo` fica vermelho. Restaure.

⚠️ Se ele **não** ficar vermelho, o teste está olhando só o status — pare e reporte. Esse é o teste
que separa a feature funcionando de uma tela vazia.

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/modules/simulado/simulado.module.ts test/caderno-template.e2e-spec.ts
npx eslint src/modules/simulado/simulado.module.ts test/caderno-template.e2e-spec.ts
git add src/modules/simulado/simulado.module.ts test/caderno-template.e2e-spec.ts
git commit -m "$(cat <<'EOF'
test(caderno): e2e do proxy de template, com a corrente de erro real

Forja o axios por dentro do HttpServiceAxios real, nao o service: e a
composicao handleError (desembrulharCorpo) -> ControllerExceptionsFilter
que precisa ser provada, e mockar o service a tiraria do caminho.

O teste que importa e o 409 do publicar COM a lista de erros de lint no
corpo. Se o filtro trocar isso por "Conflito", a tela do card 13 fica
sem ter o que mostrar e nada falha -- e o card inteiro vira fachada.

403 com visualizarProvas e sem alterarPermissao: a permissao mudou em
relacao ao card, a separacao entre quem gera prova e quem mexe no layout
nao.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: fechamento

- [ ] **Step 1: A suíte e o build**

```bash
npx jest src/modules/simulado/caderno/
npm run build
```

- [ ] **Step 2: Revisar o próprio diff**

```bash
git log --oneline develop..HEAD
git diff develop...HEAD --stat
```

Procure: `console.log`, `.only`, e — em especial — **qualquer mudança no `yarn.lock`**. Não deveria
haver nenhuma; se houver, reverta o lockfile e reporte.

- [ ] **Step 3: PR**

Base `develop`. O corpo precisa cobrir:

- os oito endpoints e a permissão **`alterarPermissao`**, com o link para a spec que registra o que
  essa escolha fecha e qual é a saída
- que **não há migration nem SQL de concessão** — e que isso é decisão, não esquecimento
- o multipart: primeiro do repo, `FormData`/`Blob` nativos, sem dependência nova, e por que não há
  `Content-Type` explícito
- o que o e2e prova, em especial o **409 com a lista de lint**
- ⚠️ **a ordem de deploy: ms → api → client**, e que o `ms#184` (card 11) precisa entrar antes deste
