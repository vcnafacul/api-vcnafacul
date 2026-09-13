# Caderno — resolução dos dois logos (api) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O api identifica quem pediu o caderno, resolve o logo do VNF e o do cursinho do colaborador, e manda os dois no POST para o ms-simulado.

**Architecture:** Um serviço novo resolve bytes em bucket (`CadernoLogosService`), o `CadernoHttpService` continua sendo o único que fala HTTP com o ms-simulado e passa a usar POST. Toda falha na resolução de um logo vira ausência, nunca exceção — o download do caderno não pode depender de um logo.

**Tech Stack:** NestJS 10, TypeORM, Axios, sharp, Jest.

**Spec:** `docs/superpowers/specs/2026-09-13-caderno-logos-resolucao-design.md`

**⚠️ Ordem de deploy:** este plano depende do plano do ms-simulado (`feature/caderno-13-logos-no-zip` lá) estar **em produção** antes. O `GET` lá continua vivo justamente para o caso de a ordem inverter, mas o caminho feliz é ms-simulado primeiro.

**Rodar um teste só:** `npx jest <caminho>`

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/shared/services/axios/http-service-axios.factory.ts` (modificar) | ganha `postBinary`, espelho do `getBinary` |
| `src/modules/simulado/caderno/caderno-logos.service.ts` (criar) | resolve os dois logos em bucket, converte para PNG, engole falha |
| `src/modules/simulado/caderno/caderno-http.service.ts` (modificar) | passa a POST, codifica os buffers em base64 |
| `src/modules/simulado/caderno/caderno.controller.ts` (modificar) | lê o `userId` do request e encadeia logos → http |
| `src/modules/simulado/simulado.module.ts` (modificar) | registra o serviço novo e importa o `PartnerPrepCourseModule` |

`caderno-logos.service.ts` fica separado do `caderno-http.service.ts` de propósito: um resolve bytes em bucket, o outro fala HTTP. Juntar faria um serviço com dois motivos para mudar.

---

## Task 1: `postBinary` no `HttpServiceAxios`

**Files:**
- Modify: `src/shared/services/axios/http-service-axios.factory.ts:147-176`
- Test: `src/shared/services/axios/http-service-axios.factory.spec.ts`

- [ ] **Step 1: Write the failing test**

Criar (ou acrescentar a) `src/shared/services/axios/http-service-axios.factory.spec.ts`:

```ts
import { Logger } from '@nestjs/common';
import { HttpServiceAxios } from './http-service-axios.factory';

// O construtor real é `(baseURL: string, logger: Logger)`, e `axiosInstance`
// é `private readonly` — sobrescrever por `as any` funciona em runtime, que é
// o que o teste precisa.
function montar(respostaAxios: unknown) {
  const servico = new HttpServiceAxios('http://ms.local', new Logger('teste'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (servico as any).axiosInstance = {
    post: jest.fn().mockResolvedValue(respostaAxios),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { servico, post: (servico as any).axiosInstance.post };
}

describe('postBinary', () => {
  const resposta = {
    data: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    headers: {
      'content-type': 'application/zip',
      'X-Caderno-Avisos': '2',
    },
  };

  it('devolve o buffer e o content-type', async () => {
    const { servico } = montar(resposta);

    const r = await servico.postBinary('v1/caderno/abc', { logos: {} });

    expect(r.buffer).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(r.contentType).toBe('application/zip');
  });

  // ⚠️ Mesma razão do getBinary: em AxiosHeaders o acesso por índice é
  // case-sensitive, e header que não passa não dá erro — ele some.
  it('normaliza os headers para minúsculas', async () => {
    const { servico } = montar(resposta);

    const r = await servico.postBinary('v1/caderno/abc', { logos: {} });

    expect(r.headers['x-caderno-avisos']).toBe('2');
  });

  it('manda o corpo e pede arraybuffer', async () => {
    const { servico, post } = montar(resposta);
    const corpo = { logos: { vnf: 'AAA=' } };

    await servico.postBinary('v1/caderno/abc', corpo);

    expect(post).toHaveBeenCalledWith(
      'http://ms.local/v1/caderno/abc',
      corpo,
      expect.objectContaining({ responseType: 'arraybuffer' }),
    );
  });

  it('sem content-type, cai no octet-stream', async () => {
    const { servico } = montar({ data: Buffer.from([0x50]), headers: {} });

    const r = await servico.postBinary('v1/caderno/abc', {});

    expect(r.contentType).toBe('application/octet-stream');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/shared/services/axios/http-service-axios.factory.spec.ts`
Expected: FAIL — `servico.postBinary is not a function`.

- [ ] **Step 3: Write minimal implementation**

Em `src/shared/services/axios/http-service-axios.factory.ts`, acrescentar logo depois do `getBinary`:

```ts
  /**
   * Espelho do `getBinary` para requisição com corpo.
   *
   * Existe porque o caderno passou a mandar os logos no corpo (card 13): o
   * `post` genérico devolve `response.data` já parseado, o que corrompe zip.
   *
   * ⚠️ Headers em minúsculas SEMPRE, pelo mesmo motivo do `getBinary`: em
   * `AxiosHeaders` o acesso por índice é case-sensitive, e um header que não
   * passa não dá erro — ele some, e ninguém descobre.
   */
  public async postBinary(
    url: string,
    body?: any,
    headers?: Record<string, string>,
  ): Promise<{
    buffer: Buffer;
    contentType: string;
    headers: Record<string, string>;
  }> {
    const fullURL = this.getFullURL(url);
    return this.requestWrapper(
      this.axiosInstance
        .post(fullURL, body, { responseType: 'arraybuffer', headers })
        .then((response) => ({
          buffer: Buffer.from(response.data),
          contentType:
            (response.headers['content-type'] as string) ??
            'application/octet-stream',
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

⚠️ O `requestWrapper` embrulha a promise e pode logar/transformar erro — o teste acima só exercita o caminho feliz, que é o que basta para a normalização de header.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/shared/services/axios/http-service-axios.factory.spec.ts`
Expected: PASS — 4 testes.

- [ ] **Step 5: Commit**

```bash
git add src/shared/services/axios/http-service-axios.factory.ts src/shared/services/axios/http-service-axios.factory.spec.ts
git commit -m "feat(axios): postBinary para requisicao binaria com corpo"
```

---

## Task 2: `CadernoLogosService`

**Files:**
- Create: `src/modules/simulado/caderno/caderno-logos.service.ts`
- Test: `src/modules/simulado/caderno/caderno-logos.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Criar `src/modules/simulado/caderno/caderno-logos.service.spec.ts`:

```ts
import { HttpException, HttpStatus } from '@nestjs/common';
import * as sharp from 'sharp';
import { CadernoLogosService } from './caderno-logos.service';

const USER_ID = 'user-1';
const PARTNER_ID = 'partner-1';

/** PNG 1x1 de verdade — o `sharp` precisa decodificar. */
async function pngReal(): Promise<Buffer> {
  return sharp({
    create: {
      width: 1,
      height: 1,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();
}

async function jpegReal(): Promise<Buffer> {
  return sharp({
    create: {
      width: 1,
      height: 1,
      channels: 3,
      background: { r: 0, g: 255, b: 0 },
    },
  })
    .jpeg()
    .toBuffer();
}

function montar(overrides: Partial<Record<string, unknown>> = {}) {
  const blobService = {
    getFile: jest.fn(),
  };
  const partnerService = {
    getByUserId: jest.fn().mockResolvedValue({ id: PARTNER_ID }),
    getLogo: jest.fn(),
  };
  const envService = { get: jest.fn().mockReturnValue('bucket-home') };
  const cache = { wrap: jest.fn((_k: string, fn: () => unknown) => fn()) };

  Object.assign(blobService, overrides.blobService ?? {});
  Object.assign(partnerService, overrides.partnerService ?? {});

  const service = new CadernoLogosService(
    blobService as never,
    partnerService as never,
    envService as never,
    cache as never,
  );

  return { service, blobService, partnerService, cache };
}

async function comOsDois() {
  const png = await pngReal();
  const b64 = png.toString('base64');
  return montar({
    blobService: {
      getFile: jest.fn().mockResolvedValue({
        buffer: b64,
        contentType: 'image/png',
      }),
    },
    partnerService: {
      getByUserId: jest.fn().mockResolvedValue({ id: PARTNER_ID }),
      getLogo: jest.fn().mockResolvedValue({
        buffer: b64,
        contentType: 'image/png',
      }),
    },
  });
}

describe('CadernoLogosService — caminho feliz', () => {
  it('resolve os dois logos', async () => {
    const { service } = await comOsDois();

    const logos = await service.resolver(USER_ID);

    expect(logos.vnf).toBeInstanceOf(Buffer);
    expect(logos.cursinho).toBeInstanceOf(Buffer);
  });

  it('busca o logo do VNF pela chave logo.png no BUCKET_HOME', async () => {
    const { service, blobService } = await comOsDois();

    await service.resolver(USER_ID);

    expect(blobService.getFile).toHaveBeenCalledWith('logo.png', 'bucket-home');
  });

  it('usa o cursinho do usuário que pediu', async () => {
    const { service, partnerService } = await comOsDois();

    await service.resolver(USER_ID);

    expect(partnerService.getByUserId).toHaveBeenCalledWith(USER_ID);
    expect(partnerService.getLogo).toHaveBeenCalledWith(PARTNER_ID);
  });
});

describe('CadernoLogosService — conversão para PNG', () => {
  // ⚠️ O `updateLogo` do cursinho não valida tipo de arquivo. Um logo em JPEG
  // dentro de um arquivo chamado `logo_cursinho.png` quebra a compilação: o
  // pdflatex escolhe o leitor pela extensão. O erro aparece no Overleaf de
  // quem baixou, longe da causa.
  it('converte um logo em JPEG para PNG de verdade', async () => {
    const jpeg = await jpegReal();
    const { service } = montar({
      partnerService: {
        getByUserId: jest.fn().mockResolvedValue({ id: PARTNER_ID }),
        getLogo: jest.fn().mockResolvedValue({
          buffer: jpeg.toString('base64'),
          contentType: 'image/jpeg',
        }),
      },
    });

    const logos = await service.resolver(USER_ID);

    expect((await sharp(logos.cursinho).metadata()).format).toBe('png');
  });
});

describe('CadernoLogosService — falha nunca derruba o download', () => {
  it('usuário sem cursinho: getByUserId lança 404 e vira ausência', async () => {
    const png = await pngReal();
    const { service } = montar({
      blobService: {
        getFile: jest
          .fn()
          .mockResolvedValue({ buffer: png.toString('base64') }),
      },
      partnerService: {
        getByUserId: jest
          .fn()
          .mockRejectedValue(
            new HttpException('Cursinho não encontrado', HttpStatus.NOT_FOUND),
          ),
      },
    });

    const logos = await service.resolver(USER_ID);

    expect(logos.cursinho).toBeUndefined();
    expect(logos.vnf).toBeInstanceOf(Buffer);
  });

  it('cursinho sem logo cadastrado vira ausência', async () => {
    const { service } = montar({
      partnerService: {
        getByUserId: jest.fn().mockResolvedValue({ id: PARTNER_ID }),
        getLogo: jest.fn().mockResolvedValue({ buffer: null }),
      },
    });

    const logos = await service.resolver(USER_ID);

    expect(logos.cursinho).toBeUndefined();
  });

  it('bucket fora no logo do VNF vira ausência', async () => {
    const { service } = montar({
      blobService: { getFile: jest.fn().mockRejectedValue(new Error('S3')) },
    });

    const logos = await service.resolver(USER_ID);

    expect(logos.vnf).toBeUndefined();
  });

  it('bytes que não são imagem viram ausência, não exceção do sharp', async () => {
    const { service } = montar({
      blobService: {
        getFile: jest.fn().mockResolvedValue({
          buffer: Buffer.from('isto não é imagem').toString('base64'),
        }),
      },
    });

    const logos = await service.resolver(USER_ID);

    expect(logos.vnf).toBeUndefined();
  });

  it('as duas falhas juntas devolvem objeto vazio, sem lançar', async () => {
    const { service } = montar({
      blobService: { getFile: jest.fn().mockRejectedValue(new Error('S3')) },
      partnerService: {
        getByUserId: jest.fn().mockRejectedValue(new Error('db')),
      },
    });

    await expect(service.resolver(USER_ID)).resolves.toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/simulado/caderno/caderno-logos.service.spec.ts`
Expected: FAIL — `Cannot find module './caderno-logos.service'`.

- [ ] **Step 3: Write minimal implementation**

Criar `src/modules/simulado/caderno/caderno-logos.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import { PartnerPrepCourseService } from 'src/modules/prepCourse/partnerPrepCourse/partner-prep-course.service';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { BlobService } from 'src/shared/services/blob/blob-service';

/** A chave fixa do logo do Você na Facul dentro do `BUCKET_HOME`. */
const CHAVE_LOGO_VNF = 'logo.png';

/** Um dia, igual ao cache que o `PartnerPrepCourseService.getLogo` já usa. */
const TTL = 60 * 60 * 24 * 1000;

export interface LogosDoCaderno {
  vnf?: Buffer;
  cursinho?: Buffer;
}

/**
 * Resolve os dois logos que o template do caderno referencia.
 *
 * ⚠️ **Nenhuma falha aqui pode derrubar o download.** O caderno é liberado por
 * `visualizarProvas`, que não exige ser colaborador de cursinho nenhum — e o
 * `getByUserId` lança 404 para quem não tem. Deixar a exceção subir tiraria a
 * feature de quem hoje consegue usá-la. Toda falha vira ausência do logo, que
 * o ms-simulado traduz num `% AVISO:` visível no Overleaf.
 *
 * Separado do `CadernoHttpService` de propósito: aquele fala HTTP com o
 * ms-simulado, este resolve bytes em bucket.
 */
@Injectable()
export class CadernoLogosService {
  private readonly logger = new Logger(CadernoLogosService.name);

  constructor(
    private readonly blobService: BlobService,
    private readonly partnerPrepCourseService: PartnerPrepCourseService,
    private readonly envService: EnvService,
    private readonly cache: CacheService,
  ) {}

  async resolver(userId: string): Promise<LogosDoCaderno> {
    const [vnf, cursinho] = await Promise.all([
      this.semQuebrar('vnf', () => this.buscarVnf()),
      this.semQuebrar('cursinho', () => this.buscarCursinho(userId)),
    ]);

    const logos: LogosDoCaderno = {};
    if (vnf) logos.vnf = vnf;
    if (cursinho) logos.cursinho = cursinho;
    return logos;
  }

  private async semQuebrar(
    rotulo: string,
    buscar: () => Promise<Buffer | undefined>,
  ): Promise<Buffer | undefined> {
    try {
      return await buscar();
    } catch (erro) {
      // `logger.error`, não `warn`: logo ausente é sempre algo a corrigir —
      // configuração no caso do VNF, cadastro no caso do cursinho.
      this.logger.error(
        `logo ${rotulo} não resolvido: ${(erro as Error).message}`,
      );
      return undefined;
    }
  }

  private async buscarVnf(): Promise<Buffer | undefined> {
    const arquivo = await this.cache.wrap(
      'caderno:logo-vnf',
      async () =>
        await this.blobService.getFile(
          CHAVE_LOGO_VNF,
          this.envService.get('BUCKET_HOME'),
        ),
      TTL,
    );
    return this.paraPng(arquivo?.buffer);
  }

  private async buscarCursinho(userId: string): Promise<Buffer | undefined> {
    // Lança 404 quando o usuário não tem cursinho — tratado pelo `semQuebrar`.
    const partner = await this.partnerPrepCourseService.getByUserId(userId);
    // `getLogo` já tem cache de um dia, chave `partner:logo:<id>`.
    const arquivo = await this.partnerPrepCourseService.getLogo(partner.id);
    return this.paraPng(arquivo?.buffer);
  }

  /**
   * ⚠️ A conversão não é defensividade gratuita: o `updateLogo` do cursinho
   * não valida tipo de arquivo nenhum, então os bytes podem ser jpg, webp ou
   * svg. Dentro de um arquivo chamado `logo_cursinho.png` isso quebra a
   * compilação — o pdflatex escolhe o leitor pela extensão.
   */
  private async paraPng(base64?: string | null): Promise<Buffer | undefined> {
    if (!base64) return undefined;
    const bruto = Buffer.from(base64, 'base64');
    if (bruto.length === 0) return undefined;
    return await sharp(bruto).png().toBuffer();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/simulado/caderno/caderno-logos.service.spec.ts`
Expected: PASS — 9 testes.

- [ ] **Step 5: Commit**

```bash
git add src/modules/simulado/caderno/caderno-logos.service.ts src/modules/simulado/caderno/caderno-logos.service.spec.ts
git commit -m "feat(caderno): servico que resolve os dois logos sem derrubar o download"
```

---

## Task 3: `CadernoHttpService` passa a POST

**Files:**
- Modify: `src/modules/simulado/caderno/caderno-http.service.ts:21-32`
- Test: `src/modules/simulado/caderno/caderno-http.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Primeiro **adaptar o `montar()` existente** (linha 3) para expor `postBinary` em vez de `getBinary`:

```ts
const montar = () => {
  const axios = {
    postBinary: jest.fn().mockResolvedValue({
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
```

E **adaptar os três testes existentes** à assinatura nova — o que eles aferem não muda, só ganham o terceiro argumento e passam a olhar `postBinary`:

```ts
  it('chama a rota do caderno no ms', async () => {
    const { service, axios } = montar();
    const r = await service.baixar('65ecc850a528b39d273e7900', false, {});
    expect(axios.postBinary).toHaveBeenCalledWith(
      'v1/caderno/65ecc850a528b39d273e7900',
      { logos: {} },
    );
    expect(r.buffer).toEqual(Buffer.from('ZIP'));
    expect(r.avisos).toBe('3');
  });

  it('draft=true vira o literal ?draft=true', async () => {
    const { service, axios } = montar();
    await service.baixar('65ecc850a528b39d273e7900', true, {});
    expect(axios.postBinary).toHaveBeenCalledWith(
      'v1/caderno/65ecc850a528b39d273e7900?draft=true',
      { logos: {} },
    );
  });

  it('sem avisos, devolve undefined em vez de string vazia', async () => {
    const { service, axios } = montar();
    axios.postBinary.mockResolvedValue({
      buffer: Buffer.from('ZIP'),
      contentType: 'application/zip',
      headers: {},
    });
    const r = await service.baixar('65ecc850a528b39d273e7900', false, {});
    expect(r.avisos).toBeUndefined();
  });
```

Depois acrescentar os testes novos ao final do arquivo:

```ts
describe('baixar — logos no corpo', () => {
  it('manda POST com os logos em base64, sob chaves semânticas', async () => {
    const { service, axios } = montar();
    const vnf = Buffer.from([0x89, 0x50]);
    const cursinho = Buffer.from([0x89, 0x51]);

    await service.baixar('507f1f77bcf86cd799439011', false, { vnf, cursinho });

    expect(axios.postBinary).toHaveBeenCalledWith(
      'v1/caderno/507f1f77bcf86cd799439011',
      {
        logos: {
          vnf: vnf.toString('base64'),
          cursinho: cursinho.toString('base64'),
        },
      },
    );
  });

  // ⚠️ O ms-simulado tolera `null`, mas o contrato é omitir. Mandar `null`
  // funcionaria hoje e é o tipo de divergência que ninguém revisa depois.
  it('omite a chave do logo ausente em vez de mandar null', async () => {
    const { service, axios } = montar();

    await service.baixar('507f1f77bcf86cd799439011', false, {
      vnf: Buffer.from([0x89]),
    });

    const corpo = axios.postBinary.mock.calls[0][1];
    expect(corpo.logos).toEqual({ vnf: Buffer.from([0x89]).toString('base64') });
    expect('cursinho' in corpo.logos).toBe(false);
  });

  it('sem logo nenhum, manda o objeto vazio', async () => {
    const { service, axios } = montar();

    await service.baixar('507f1f77bcf86cd799439011', false, {});

    expect(axios.postBinary.mock.calls[0][1]).toEqual({ logos: {} });
  });

  // ⚠️ Mesma regra do GET: o literal, nunca o valor recebido. Concatenar o que
  // veio na query injeta parâmetro na chamada interna.
  it('draft=true vira o literal ?draft=true', async () => {
    const { service, axios } = montar();

    await service.baixar('507f1f77bcf86cd799439011', true, {});

    expect(axios.postBinary.mock.calls[0][0]).toBe(
      'v1/caderno/507f1f77bcf86cd799439011?draft=true',
    );
  });

  it('continua devolvendo o aviso do header em minúsculas', async () => {
    const { service } = montar();

    const r = await service.baixar('507f1f77bcf86cd799439011', false, {});

    expect(r.avisos).toBe('3');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/simulado/caderno/caderno-http.service.spec.ts`
Expected: FAIL — `baixar` ainda aceita dois argumentos e chama `getBinary`.

- [ ] **Step 3: Write minimal implementation**

Substituir o método `baixar` em `src/modules/simulado/caderno/caderno-http.service.ts`:

```ts
  /**
   * ⚠️ **POST, não GET, desde o card 13:** a requisição passou a carregar os
   * logos, que o ms-simulado não tem como buscar (a chave do logo do cursinho
   * está no MySQL e depende de quem pediu).
   *
   * O `GET v1/caderno/:id` continua existindo do outro lado, gerando zip sem
   * logos — é o que segura a janela entre os dois deploys.
   */
  async baixar(
    simuladoId: string,
    draft: boolean,
    logos: LogosDoCaderno,
  ): Promise<{ buffer: Buffer; contentType: string; avisos?: string }> {
    // ⚠️ O literal, não o valor recebido: concatenar o que veio na query
    // injeta parâmetro na chamada interna. O `simuladoId` já veio validado
    // pelo ObjectIdPipe.
    const rota = `v1/caderno/${simuladoId}${draft ? '?draft=true' : ''}`;

    // ⚠️ O base64 é feito aqui, não no `CadernoLogosService`: quem fala HTTP é
    // quem codifica para HTTP. E a chave é OMITIDA quando não há logo — o
    // outro lado tolera `null`, mas o contrato é a ausência.
    const corpo = { logos: {} as Record<string, string> };
    for (const [chave, buffer] of Object.entries(logos)) {
      if (buffer) corpo.logos[chave] = buffer.toString('base64');
    }

    const { buffer, contentType, headers } = await this.axios.postBinary(
      rota,
      corpo,
    );
    // Minúsculas: é como o `postBinary` normaliza. Ver o docblock lá.
    return { buffer, contentType, avisos: headers['x-caderno-avisos'] };
  }
```

E acrescentar o import:

```ts
import { LogosDoCaderno } from './caderno-logos.service';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/simulado/caderno/caderno-http.service.spec.ts`
Expected: PASS — os três adaptados mais os cinco novos.

- [ ] **Step 5: Commit**

```bash
git add src/modules/simulado/caderno/caderno-http.service.ts src/modules/simulado/caderno/caderno-http.service.spec.ts
git commit -m "feat(caderno): hop interno vira POST levando os logos"
```

---

## Task 4: o controller passa o `userId`

**Files:**
- Modify: `src/modules/simulado/caderno/caderno.controller.ts:55-73`
- Test: `src/modules/simulado/caderno/caderno.controller.spec.ts`

- [ ] **Step 1: Write the failing test**

O `montar()` existente (linha 3) precisa passar a construir o controller com **dois** serviços, e todas as chamadas posicionais existentes ganham o `req`. Substituir o topo do arquivo por:

```ts
import { CadernoController } from './caderno.controller';

const USER_ID = 'user-1';
const REQ = { user: { id: USER_ID } } as any;

const montar = (retorno: any = {}) => {
  const service = {
    baixar: jest.fn().mockResolvedValue({
      buffer: Buffer.from('ZIP'),
      contentType: 'application/zip',
      avisos: '3',
      ...retorno,
    }),
  };
  const logos = { resolver: jest.fn().mockResolvedValue({}) };
  const res: any = { setHeader: jest.fn(), send: jest.fn() };
  return {
    controller: new CadernoController(service as any, logos as any),
    service,
    logos,
    res,
  };
};

const montarECheckarContentType = async (contentType: string) => {
  const { controller, res } = montar({ contentType });
  await controller.baixar('65ecc850a528b39d273e7900', undefined, REQ, res);
  expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
};
```

⚠️ Nos testes existentes, trocar toda chamada
`controller.baixar('65ecc850a528b39d273e7900', undefined, res)` por
`controller.baixar('65ecc850a528b39d273e7900', undefined, REQ, res)`. O que
eles aferem não muda.

Depois acrescentar ao final do arquivo:

```ts
describe('baixar — logos', () => {
  it('resolve os logos do usuário do request e repassa ao http service', async () => {
    const { controller, logos, service, res } = montar();
    const resolvidos = { vnf: Buffer.from([0x89]) };
    logos.resolver.mockResolvedValue(resolvidos);

    await controller.baixar('65ecc850a528b39d273e7900', undefined, REQ, res);

    expect(logos.resolver).toHaveBeenCalledWith(USER_ID);
    expect(service.baixar).toHaveBeenCalledWith(
      '65ecc850a528b39d273e7900',
      false,
      resolvidos,
    );
  });

  it('repassa o draft', async () => {
    const { controller, service, res } = montar();

    await controller.baixar('65ecc850a528b39d273e7900', 'true', REQ, res);

    expect(service.baixar).toHaveBeenCalledWith(
      '65ecc850a528b39d273e7900',
      true,
      expect.anything(),
    );
  });

  it('continua mandando o Content-Disposition com o nome do arquivo', async () => {
    const { controller, res } = montar();

    await controller.baixar('65ecc850a528b39d273e7900', undefined, REQ, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="caderno-65ecc850a528b39d273e7900.zip"',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/simulado/caderno/caderno.controller.spec.ts`
Expected: FAIL — `baixar` ainda tem três parâmetros e o controller não recebe `CadernoLogosService`.

- [ ] **Step 3: Write minimal implementation**

Em `src/modules/simulado/caderno/caderno.controller.ts`, acrescentar `Req` ao import de `@nestjs/common` e:

```ts
import { Request } from 'express';
import { User } from 'src/modules/user/user.entity';
import { CadernoLogosService } from './caderno-logos.service';
```

Trocar o construtor:

```ts
  constructor(
    private readonly service: CadernoHttpService,
    private readonly logos: CadernoLogosService,
  ) {}
```

E o método `baixar`:

```ts
  async baixar(
    @Param('simuladoId', ObjectIdPipe) simuladoId: string,
    @Query('draft') draft: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // ⚠️ O cursinho sai de quem PEDIU, não do simulado: o mesmo simulado
    // baixado por dois colaboradores sai com logos diferentes.
    const logos = await this.logos.resolver((req.user as User).id);

    const { buffer, contentType, avisos } = await this.service.baixar(
      simuladoId,
      draft === 'true',
      logos,
    );

    res.setHeader('Content-Type', contentType || 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="caderno-${simuladoId}.zip"`,
    );
    if (avisos !== undefined) res.setHeader('X-Caderno-Avisos', avisos);

    res.send(buffer);
  }
```

O `@Res()` continua **depois** do `@Req()` na lista de parâmetros; os decoradores é que ligam, não a ordem — mas os testes acima chamam posicionalmente, então a ordem do código precisa bater com a do spec.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/simulado/caderno/caderno.controller.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/simulado/caderno/caderno.controller.ts src/modules/simulado/caderno/caderno.controller.spec.ts
git commit -m "feat(caderno): controller resolve os logos do usuario que pediu"
```

---

## Task 5: registrar no módulo

**Files:**
- Modify: `src/modules/simulado/simulado.module.ts:43-50,92`

- [ ] **Step 1: Escrever o teste de boot**

Criar `src/modules/simulado/caderno/caderno.module-wiring.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { SimuladoModule } from '../simulado.module';
import { CadernoLogosService } from './caderno-logos.service';

// ⚠️ Este teste existe por causa de um risco específico: o
// `PartnerPrepCourseModule` tem `forwardRef` para Collaborator e
// VcnafaculForm. Se importá-lo no SimuladoModule criar ciclo, o Nest só
// reclama ao montar o container — nunca na compilação.
describe('SimuladoModule — fiação do caderno', () => {
  it('monta e resolve o CadernoLogosService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SimuladoModule],
    }).compile();

    expect(moduleRef.get(CadernoLogosService)).toBeDefined();
    await moduleRef.close();
  });
});
```

Se o `SimuladoModule` exigir banco/env para compilar no teste, e o custo de mockar for alto, substitua este teste por rodar `npm run build` + subir a app localmente (`npm run dev`) e conferir que não há erro de dependência circular no log. Registre no PR qual caminho foi usado.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/simulado/caderno/caderno.module-wiring.spec.ts`
Expected: FAIL — `Nest can't resolve dependencies of the CadernoLogosService`.

- [ ] **Step 3: Write minimal implementation**

Em `src/modules/simulado/simulado.module.ts`:

```ts
import { PartnerPrepCourseModule } from '../prepCourse/partnerPrepCourse/partner-prep-course.module';
import { CadernoLogosService } from './caderno/caderno-logos.service';
```

Acrescentar ao array `imports` (`BlobModule`, `CacheManagerModule` e `EnvModule` já estão lá):

```ts
  imports: [
    BlobModule,
    HttpModule,
    UserModule,
    EnvModule,
    CacheManagerModule,
    AuditLogModule,
    PartnerPrepCourseModule,
  ],
```

E ao array `providers`, junto do `CadernoHttpService`:

```ts
    CadernoLogosService,
```

Se o Nest acusar dependência circular ao subir, trocar por
`forwardRef(() => PartnerPrepCourseModule)` — o próprio
`PartnerPrepCourseModule` já usa `forwardRef` para dois dos seus imports, então
o padrão existe no repo.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/simulado/caderno/caderno.module-wiring.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/simulado/simulado.module.ts src/modules/simulado/caderno/caderno.module-wiring.spec.ts
git commit -m "feat(caderno): registra CadernoLogosService no SimuladoModule"
```

---

## Task 6: suíte, lint e build

**Files:** nenhum novo.

- [ ] **Step 1: Specs unitários do caderno**

Run: `npx jest src/modules/simulado/caderno src/shared/services/axios`
Expected: PASS.

- [ ] **Step 2: Suíte e2e**

Run: `npm run test`
Expected: PASS. (Sobe MySQL em Docker, roda migrations, e2e, derruba.) Se `test/caderno.e2e-spec.ts` mockar o hop interno por GET, adaptar para POST no mesmo passo.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sem erro novo.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: compila.

- [ ] **Step 5: Commit se houver ajuste**

```bash
git add -u
git commit -m "chore(caderno): ajustes da suite completa"
```

---

## Verificação manual antes do PR

Com o ambiente local de pé (`npm run dev` nos dois serviços):

1. Baixar o caderno como um colaborador **com** cursinho e logo → o zip tem `logo_vnf.png` e `logo_cursinho.png`, e o `X-Caderno-Avisos` não conta logo ausente.
2. Baixar como um usuário **sem** cursinho → o zip sai, sem `logo_cursinho.png`, e o `conteudo.tex` tem o `% AVISO:` correspondente. **Este é o caso que não pode dar 500.**
3. Conferir no log do api que a falha do passo 2 apareceu como `logger.error`, não como exceção não tratada.
4. Subir o zip no Overleaf e confirmar que compila nos dois casos.

⚠️ O passo 4 depende do template publicado guardar os `\includegraphics` com `\IfFileExists` — ver a verificação manual do plano do ms-simulado.
