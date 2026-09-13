# Caderno — resolução dos dois logos (api)

**Data:** 2026-09-13
**Serviços:** `api-vcnafacul` (este doc) + `ms-simulado` (ver
`2026-09-13-caderno-logos-no-zip-design.md` lá, que define o contrato)

---

## Problema

O template do caderno passou a referenciar `logo_vnf.png` e `logo_cursinho.png`.
Os dois moram em buckets que só o api conhece, e o do cursinho depende de **quem
está baixando** — informação que só existe aqui, no JWT.

## O que muda no fluxo

O contrato público **não muda**: o cliente continua em
`GET /mssimulado/caderno/:simuladoId`. Muda o hop interno, que passa de
`GET v1/caderno/:id` para `POST v1/caderno/:id` com os logos no corpo.

```
cliente ──GET──▶ api ──┬─▶ BUCKET_HOME / logo.png
                       ├─▶ getByUserId(userId) → getLogo(partnerId)
                       └──POST {logos}──▶ ms-simulado ──▶ zip
```

## `CadernoLogosService`

Serviço novo, um método: `resolver(userId): Promise<{ vnf?: Buffer; cursinho?: Buffer }>`.

Separado do `CadernoHttpService` de propósito: aquele fala HTTP com o
ms-simulado, este resolve bytes em bucket. Juntar faria um serviço com dois
motivos para mudar.

| Logo | Origem | Cache |
|---|---|---|
| `vnf` | `blobService.getFile('logo.png', BUCKET_HOME)` | novo, 1 dia, chave `caderno:logo-vnf` |
| `cursinho` | `partnerPrepCourseService.getByUserId(userId)` → `getLogo(partner.id)` | **já existe**, 1 dia, chave `partner:logo:<id>` |

O `getLogo` existente já faz exatamente o que precisamos (lê
`partner_prep_course.logo` do `BUCKET_PARTNERSHIP_DOC`, com cache) — é
reaproveitado, não reescrito.

### Conversão para PNG é obrigatória

Os dois buffers passam por `sharp(buf).png().toBuffer()`.

⚠️ **Não é defensividade gratuita.** O `PartnerPrepCourseService.updateLogo` não
valida tipo de arquivo nenhum: um cursinho pode ter subido `.jpg`, `.webp` ou
`.svg` como logo. Esses bytes dentro de um arquivo chamado `logo_cursinho.png`
quebram a compilação — o pdflatex escolhe o leitor de imagem pela **extensão**, e
um JPEG com extensão `.png` falha com uma mensagem que não aponta para a causa,
no Overleaf de quem baixou.

O `sharp@0.33.5` já é dependência e já é o que o `createThumbnail` usa.

### Falha nunca derruba o download

Qualquer erro em qualquer um dos dois logos vira ausência: `logger.error` e
segue sem ele.

Casos cobertos:

| Caso | Hoje | Depois |
|---|---|---|
| usuário sem cursinho | `getByUserId` lança **404** | sem `logo_cursinho.png` |
| cursinho sem logo cadastrado | `partnerPrepCourse.logo` nulo | sem `logo_cursinho.png` |
| chave quebrada / objeto sumiu | `getFile` lança | sem aquele logo |
| `logo.png` ausente no `BUCKET_HOME` | — | sem `logo_vnf.png`, `logger.error` |

⚠️ **O 404 do `getByUserId` é o caso que importa.** O download do caderno é
liberado por `visualizarProvas`, que não exige ser colaborador de cursinho
nenhum. Deixar a exceção subir tiraria a feature de quem hoje consegue usá-la —
um admin, por exemplo.

O logo do VNF recebe o mesmo tratamento. Se ele sumir do bucket é erro nosso de
configuração, mas derrubar a geração da prova por causa de um logo é pior do que
gerar sem ele; o `logger.error` é o que denuncia.

## `CadernoController`

`baixar` ganha `@Req() req` e passa `(req.user as User).id` adiante, no mesmo
padrão do `CollaboratorController`. Guards e permissão ficam como estão.

## `CadernoHttpService`

`baixar(simuladoId, draft, logos)` passa a usar POST. O `CadernoLogosService`
devolve `Buffer`; **o base64 do contrato é feito aqui**, ao montar o corpo —
quem fala HTTP é quem codifica para HTTP. Chave omitida do objeto quando o
`Buffer` é `undefined`, nunca `null` explícito. O `HttpServiceAxios` tem
`get`, `post` e `getBinary`, mas não `postBinary` — precisa de um, espelhando o
`getBinary` (mesma normalização de headers em minúsculas, mesmo tratamento de
`contentType`).

⚠️ A rota continua montada com literal, nunca com o valor recebido — a regra do
docblock atual sobre injeção de parâmetro vale igual no POST.

## Testes

- `caderno-logos.service.spec.ts` — resolve os dois; converte para PNG; cada
  uma das quatro falhas da tabela vira ausência e não exceção; o 404 do
  `getByUserId` não escapa
- `caderno-http.service.spec.ts` — manda POST com o corpo no formato do
  contrato; chaves ausentes quando não há logo
- `caderno.controller.spec.ts` — repassa o `userId` do request

## Fora de escopo

- Validar tipo de arquivo no `updateLogo` do cursinho. Seria a correção na
  origem, mas mexe num fluxo que não é este e exige decidir o que fazer com os
  logos já cadastrados em formato não-PNG. Card próprio; a conversão com
  `sharp` resolve o sintoma aqui sem tocar naquele fluxo.
- Redimensionar o logo do cursinho. O template controla a altura com
  `\includegraphics[height=...]`.
