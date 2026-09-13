# Card 12 · Proxy do template na api

**Etapa:** Caderno · Overleaf · **Branch:** `feature/caderno-12-proxy-template` (de `develop`)
**Card:** `docs/prova-latex-overleaf/cards/12-proxy-template-api.md` · **Bloqueia:** card 13
**Bloqueado por:** card 10 (mergeado, `ms#183`) e card 11 (`ms#184`, aberto e segurado até o card 13)

---

## O que é

Expor pelo `api-vcnafacul` os oito endpoints de template do ms-simulado, para o card 13 ter o que
chamar. É proxy 1:1 — nenhuma regra de negócio nova.

---

## A decisão de permissão, e o que ela custa

**`alterarPermissao`, reusada. Sem permissão nova.** Decidido pelo dono em 2026-09-12, contra o que o
card propunha.

O card pedia uma `gerenciarTemplateCaderno` nova, com o argumento de que publicar um template ruim
afeta todos os cursinhos. O contra-argumento que venceu é de custo: numa organização onde o template
será editado por uma ou duas pessoas que já são administradoras, uma coluna nova traz migration,
label no client e SQL de concessão em cada ambiente — e a chance de a tela existir e não abrir para
ninguém, que é o risco que o próprio card levantava.

⚠️ **O que isso fecha, e que precisa estar escrito:** `alterarPermissao` é a permissão de **conceder
permissões a outros usuários**. Enquanto o template estiver atrás dela, delegar a edição do layout a
um coordenador significa dar a ele o poder de se conceder qualquer permissão. Não há meio-termo.

**A saída, se um dia for preciso:** criar a coluna `gerenciarTemplateCaderno` e trocar o
`@SetMetadata` de oito rotas. O precedente de como fazer é o par
`gerenciarFormularioGlobal`/`gerenciarFormulario`, que já existe no `role.entity.ts` e resolve
exatamente este formato de problema — algo global que só admin da plataforma mexe. O custo de mudar
depois é baixo justamente porque este card não espalha a decisão: ela vive em um `@SetMetadata` por
rota, e em nenhum outro lugar.

⚠️ O critério de aceitação do card — *"usuário com `visualizarProvas` mas sem a permissão → 403"* —
**continua valendo e continua sendo o ponto**. A separação entre "quem gera prova" e "quem mexe no
layout" existe; a linha só ficou num lugar mais alto.

---

## O que foi verificado antes de escrever

| premissa do card | medido |
|---|---|
| o submódulo `simulado/caderno/` existe | ✅ do card 05: `caderno.controller.ts` + `caderno-http.service.ts` |
| `getBinary` com `arraybuffer` | ✅ no `HttpServiceAxiosFactory`, com normalização de header em minúsculas |
| corpo de erro chega íntegro | ✅ `desembrulharCorpo` + `handleError` relançam `HttpException(errorData, status)` |
| o body parser aguenta 5 MB | ✅ `main.ts` já usa `30mb` em `json` e `urlencoded` |
| `AuditLogModule` existe e é usável | ✅ `AuditLogService` já injetado em `simulado.service` e `questao.service` |
| **upload multipart tem precedente** | ❌ **falso — ver abaixo** |
| `form-data` nas dependências | ❌ ausente |

### A premissa falsa

O card diz que o upload segue *"o mesmo padrão do upload de cartão escaneado (etapa 7) e do upload de
imagem de questão"*.

**Não segue.** Aqueles endpoints recebem multipart e gravam no R2 pelo `BlobService`. Nenhum deles
**repassa** multipart adiante. Em toda a api não existe hoje um caso de "recebe arquivo e reenvia
como multipart para o ms" — este é o primeiro.

---

## Estrutura

```
src/modules/simulado/caderno/
├── caderno.controller.ts             (card 05, intocado)
├── caderno-http.service.ts           (card 05, intocado)
├── caderno-template.controller.ts    ← novo
└── caderno-template-http.service.ts  ← novo
```

Prefixo `mssimulado/caderno/template`, seguindo o `mssimulado/caderno` do card 05.

Todos os oito com `@UseGuards(JwtAuthGuard, PermissionsGuard)` e
`@SetMetadata(PermissionsGuard.name, Permissions.alterarPermissao)`.

⚠️ **`JwtAuthGuard` junto, não só o `PermissionsGuard`.** O card 05 deixou o comentário do porquê: o
`PermissionsGuard` devolve `false` quando não há token, e o Nest traduz `false` para **403**, não 401.
Sem os dois, "sem token" e "sem permissão" viram a mesma resposta.

| método | rota | proxy para |
|---|---|---|
| `GET` | `/template` | a versão publicada |
| `GET` | `/template/rascunho` | o rascunho (404 se não houver) |
| `POST` | `/template/rascunho` | multipart com o zip |
| `DELETE` | `/template/rascunho` | descarta |
| `POST` | `/template/rascunho/publicar` | publica |
| `GET` | `/template/versoes` | lista |
| `POST` | `/template/versoes/:n/restaurar` | restaura |
| `GET` | `/template/teste` | **binário** |

---

## As três partes que exigem cuidado

### 1. O multipart, que é o primeiro do repo

O controller recebe com `FileInterceptor('arquivo')` e o serviço reenvia ao ms.

**Sem dependência nova:** `FormData` e `Blob` nativos do Node. Medido: existem no Node 20.19.6, e o CI
usa `node-version: 20.x`.

⚠️ **O risco é o boundary.** O `Content-Type` de um multipart carrega um delimitador gerado na hora
(`multipart/form-data; boundary=----WebKitFormBoundary…`). Quem monta é o axios, a partir do
`FormData`. O `post` do factory aceita `headers` opcionais — passar um `Content-Type` ali **atropela**
o boundary, e o ms recebe um corpo que não consegue parsear. Falha barulhenta, mas de diagnóstico
ruim: parece problema do ms.

Por isso o teste não pode se contentar com "o axios foi chamado": ele precisa provar que **o que sai
é um multipart parseável, com o arquivo dentro**.

⚠️ **Dois limites, não um.** O `FileInterceptor` ganha `limits: { fileSize: 5MB }` — é a trava que
corta antes de o corpo inteiro entrar na memória do processo. O limite do ms (card 10) continua lá e é
a última linha. O body parser global de 30 MB não é limite de nada aqui: ele é grande demais para
proteger e não se aplica a multipart.

### 2. Os corpos de erro, que são a feature

O `POST /rascunho` responde **200 com `{ aceitos, ignorados, erros, avisos }`** mesmo quando o lint
reprova — o rascunho é salvo e a pessoa não perde o upload. O `publicar` responde **409 com a lista de
erros de lint**. O card 13 mostra as duas coisas na tela.

O caminho já existe: `desembrulharCorpo` (card 05) desembrulha o corpo do erro do ms, e o
`handleError` relança `HttpException(errorData, status)`, o que preserva corpo **e** status.

⚠️ **Isso é expectativa, não certeza, até ter teste.** É o único lugar deste card onde um defeito
inutiliza a feature em vez de quebrá-la: um filtro que troque a lista de erros por `"Conflito"`
genérico deixa a tela do card 13 sem ter o que mostrar, e nada falha.

### 3. O binário e os query params

`GET /template/teste` usa `getBinary`, como o `baixar` do card 05.

⚠️ **Nada do que veio na query entra na rota interna como texto.** O card 05 já deixou escrito que
concatenar valor de query na chamada ao ms é injeção de parâmetro. `versao` vira número e é
reserializado; `rascunho` vira o literal `rascunho=1`.

⚠️ **E isso obriga a api a repetir a validação do ms — não há como não repetir.** Se ela monta o
literal, ela nunca envia `?rascunho=xis`, então o 400 do ms **nunca dispara** e um valor estranho
viraria "sim" em silêncio: exatamente o defeito que o ms existe para evitar, reintroduzido uma camada
acima.

Então a api aplica a mesma regra, de propósito e por escrito:

| entrada | api |
|---|---|
| `?rascunho=1` ou `?rascunho=true` | monta `rascunho=1` |
| `?rascunho=` com qualquer outro valor | **400**, sem chamar o ms |
| `?versao=` não numérico | **400**, sem chamar o ms |
| os dois parâmetros juntos | **400**, sem chamar o ms |

A duplicação é aceita porque a alternativa é injeção, e porque o modo de falha de uma divergência é
benigno: se um lado ficar mais estrito que o outro, o pedido é recusado — nunca aceito com a versão
errada. O que **não** pode divergir é a lista de valores aceitos, e por isso ela está escrita aqui e
tem teste dos dois lados.

---

## Auditoria

`publicar` e `restaurar` gravam no `AuditLogService`, que já existe e já é usado.

| campo | valor |
|---|---|
| `entityType` | `'caderno-template'` |
| `entityId` | o número da versão, como string |
| `updatedBy` | o id do usuário do JWT |
| `changes` | `{ acao: 'publicar' \| 'restaurar', versao, notas }` |

⚠️ **Grava depois do sucesso, nunca antes.** Um log de "publicou a v5" para uma publicação que o ms
recusou com 409 é pior que log nenhum: manda procurar uma versão que não existe.

⚠️ `updatedBy` é FK para `User` — precisa ser o id real do usuário, não o e-mail.

---

## Testes

**Unitários do serviço HTTP:**
- o upload monta um multipart **parseável**, com o arquivo dentro e o nome de campo certo
- nenhum `Content-Type` explícito é passado ao axios no upload (senão o boundary morre)
- `?versao=3` vira `versao=3` na rota interna; `?rascunho=1` e `?rascunho=true` viram o literal
- `?rascunho=xis`, `?versao=abc` e os dois juntos → 400 **sem chamar o ms**
- `getBinary` devolve o buffer e o content-type

**Unitários do controller:**
- as oito rotas existem, com os dois guards e a permissão certa
- `publicar` e `restaurar` chamam o audit **depois** do sucesso; num erro do ms, **não** chamam

**E2E (`test/caderno-template.e2e-spec.ts`, no molde do `caderno.e2e-spec.ts`):**
- sem JWT → **401** (não 403 — é o que os dois guards juntos garantem)
- com JWT sem `alterarPermissao` → **403**
- com `visualizarProvas` e sem `alterarPermissao` → **403** (a separação é o ponto do card)
- `publicar` que reprova no lint → **409 com a lista de erros no corpo**, não `"Conflito"`
- `POST /rascunho` com lint sujo → **200** com `{ aceitos, ignorados, erros, avisos }` íntegro
- zip de 5 MB atravessa
- `GET /teste` → zip **byte-idêntico** ao que o ms devolveu

---

## Critérios de aceitação

Os do card, menos os três que a decisão de permissão eliminou (migration, `RolesLabel`, SQL de
concessão), mais:

- [ ] O multipart que chega ao ms é parseável — provado, não presumido
- [ ] Nenhum `Content-Type` explícito no upload
- [ ] O 409 do `publicar` chega com a lista de lint no corpo
- [ ] O audit não grava quando o ms recusa
- [ ] `?versao` não numérico não alcança o ms

---

## Risco

**Baixo.** É proxy, e o ms já tem toda a lógica testada.

O ponto de atenção é o multipart, por ser o primeiro do repo: não há padrão local para copiar, e o
modo de falha (boundary atropelado) parece defeito do ms quando não é.

O risco que o card apontava — permissão nova sem SQL de concessão, tela que não abre para ninguém —
**deixou de existir** com a decisão de reusar `alterarPermissao`.

## O que este card NÃO faz

**Não tem tela** — card 13.
**Não cria permissão nova** — decisão registrada acima, com a saída documentada.
**Não valida regra de negócio.** A única validação que ele repete é a dos query params do `/teste`, e
só porque montar a rota interna sem interpretá-los seria injeção — está justificado acima.
