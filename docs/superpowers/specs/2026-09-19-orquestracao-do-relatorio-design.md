# A orquestração do relatório de simulado

> Card de origem: `vcnafacul-3/docs/cards/relatorio-simulado-cursinho/04-BACK-orquestracao-do-relatorio-na-api.md`
> Repo: `api-vcnafacul` · Branch: `feature/04-orquestracao-do-relatorio`
> Consome: ms-simulado **#193** (linhas) e **#194** (questões), ambos mergeados

---

## O que sobrou para a api

Depois da decisão do card `08`, o recorte é um fato gravado no ms — a api não resolve mais lista de
`userId`. Sobraram duas coisas:

1. **Resolver o cursinho de quem pediu**, pelo JWT (`CursinhoResolverService`, já existe).
2. **Hidratar** cada linha com nome e matrícula do MySQL, porque o ms só conhece `userId`.

E uma terceira que o card não previa: **a lista parte dos estudantes**, não das linhas.

## As rotas

Todas com permissão `gerenciarEstudantes`, todas resolvendo `cursinhoId` pelo JWT.

| rota | o que faz |
|---|---|
| `GET /mssimulado/relatorio/simulado/:simuladoId` | geral do cursinho, hidratado |
| `GET /mssimulado/relatorio/simulado/:simuladoId/turma/:turmaId` | idem, restrito à turma |
| `GET /mssimulado/relatorio/simulado/:simuladoId/questoes` | proxy fino do agregado por questão |
| `GET /mssimulado/relatorio/simulado/:simuladoId/turma/:turmaId/questoes` | idem, restrito à turma |

⚠️ **As duas de questões não estavam no card.** Sem elas o agregado do card `03` fica inalcançável
pelo client, e os cards `05`/`06` — que o `03` diz bloquear — chegariam sem rota para a aba de
questões. São proxy puro: nenhum dado de estudante, nenhuma hidratação.

## Decisões

### A lista parte dos estudantes, não das linhas

Turma de 30 com 22 cartões: os 8 que faltam **aparecem**, com `enviouCartao: false`.

⚠️ Saber quem falta é metade do valor do relatório para quem coordena, e some se a consulta partir
dos históricos.

⚠️ **`enviouCartao` explícito, não a ausência de `historicoId`.** Um consumidor que precise inferir
"não enviou" da ausência de um campo vai inferir errado mais cedo ou mais tarde. E um `status:
'nao_enviou'` sintético poluiria o enum do ms com um valor que o ms não conhece.

### O 403 da turma: honestidade, não segurança

⚠️ **O card justifica errado.** Ele diz que sem a checagem *"o relatório listaria os nomes dos alunos
de outra turma"*. Não listaria: a consulta de estudantes é escopada por `partnerPrepCourse.id`
resolvido do JWT, então aluno de outro cursinho nunca volta. O vazamento fecha sozinho.

O 403 continua certo por outro motivo: sem ele, pedir uma turma que não é sua devolve uma lista
**vazia**, indistinguível de "turma sua, ninguém matriculado". São coisas diferentes e a tela precisa
saber qual é.

⚠️ **E o `cursinhoId` vem sempre do JWT, nunca da URL.** Nenhum parâmetro consegue trocá-lo.

### Uma consulta de estudantes, não N

⚠️ N+1 na hidratação mata a rota. Uma consulta traz estudante + nome + matrícula + turma.

A casa já tem o formato: `ClassRepository.findOneByIdToAttendanceRecord` faz exatamente isso para a
frequência — `leftJoin` em `students`, `addSelect` dos campos de nome, filtrando por
`applicationStatus = Enrolled`. O relatório precisa do mesmo, mais o `partnerPrepCourse` (para o 403)
e uma versão sem turma (para o geral).

### Sem paginação

Mesmo motivo do card `02`: o agregado é calculado sobre o conjunto inteiro, e paginar obrigaria a
recalcular a média por página ou a fazer uma segunda passada. Um cursinho tem algumas centenas de
estudantes.

### O agregado é calculado sobre ESTE conjunto

Foi o pedido explícito: *"um aproveitamento geral daquele simulado, mas somente com base nos
estudantes definidos aqui"*. Reaproveitar um agregado global entregaria outro número, parecido o
bastante para ninguém notar.

⚠️ **A média exclui quem não teve leitura concluída.** Cartão com erro não vale como leitura;
contá-lo como zero puxa a média para baixo e a turma parece pior do que foi. **E as duas contagens
aparecem**, senão ninguém entende a diferença entre "30 alunos" e "27 no cálculo".

⚠️ **Correção (revisão adversarial, Fix 1): "não tem aproveitamento" era falso.** O `marcarFalha` do
ms (`historico.repository.ts:255-266`) grava `status` e `falha` e **não limpa `aproveitamento`** — um
cartão que leu bem, foi refotografado e falhou mantém a nota da tentativa anterior. Inferir "leitura
concluída" da presença da nota contava esse cartão; medido, uma turma com `1.0` e um cartão falho de
`0.2` devolvia média `0.6`. E a aba de questões, que filtra `status: completed` **no ms**
(`relatorio-simulado-estudante.repository.ts:175`), excluía o mesmo cartão — as duas metades da mesma
tela discordariam, sem ninguém saber qual estava certa. O gate é no `status`, não na presença do
número.

### O resumo

```ts
{
  totalNoRecorte: number,                        // estudantes matriculados no recorte
  comLeituraConcluida: number,                   // denominador da média
  aproveitamentoGeral: number | null,            // null quando ninguém tem leitura
  totalEstudantesComCartaoNoCursinho: number,    // vem do ms, alimenta o rodapé da turma
  temEstudanteSemTurma: boolean,                 // só faz sentido no geral
  linhasSemEstudanteAtivo: number,               // ver abaixo
}
```

⚠️ **`linhasSemEstudanteAtivo` não estava no card, e é o espelho de "quem não enviou".** A consulta
de estudantes filtra `applicationStatus = Enrolled` e `deletedAt IS NULL`. Um estudante que saiu do
cursinho depois de enviar o cartão some da lista — mas a linha dele continua na junção do ms. Sem
contar essas, os totais param de bater com `totalEstudantesComCartaoNoCursinho` e a leitura natural
é *"o sistema perdeu cartão"*, que é exatamente o chamado que o card `08` quis evitar.

Contar custa uma subtração sobre dado que já está em memória. **Contar, não listar** — o nome de
quem saiu não é informação que este relatório deva expor.

---

## Riscos

⚠️ ~~**A permissão por rota não é pega por teste de unidade neste repo.**~~ **Correção: dá, sim, e
o teste está no branch.** O risco original supunha que só o guard em execução provaria a permissão.
Mas o `PermissionsGuard` lê `reflector.get(PermissionsGuard.name, context.getHandler())` — e um
teste pode ler a **mesma chave do mesmo lugar**: `relatorio.controller.spec.ts` afirma, para os
quatro handlers, que o metadado é `Permissions.gerenciarEstudantes`. Junto com o
`permission.guard.spec.ts`, que já cobre o comportamento do guard dado o metadado, a corrente fecha
em processo: a mutação que troca a permissão, ou que move o `@SetMetadata` para a classe (onde o
guard não o enxerga e **libera** a rota), morre.

A conferência manual das quatro rotas continua no PR — mas como confirmação, não como única defesa.

⚠️ **Colisão de rota literal × `:param`.** `…/:simuladoId/turma/:turmaId` e
`…/:simuladoId/questoes` convivem, e `…/:simuladoId/turma/:turmaId/questoes` também. Diferem em
contagem de segmentos, então não colidem — mas isto é uma armadilha conhecida da casa (há um caso
documentado no `caderno.controller.ts` do ms), e **um teste de unidade não pega**: ele chama o
método direto, sem roteamento. Precisa de um teste que suba o app.

⚠️ **O `turmaId` do ms é opcional e o filtro `{turmaId: undefined}` casa só quem não tem turma** —
lição do card `02`. A api não monta filtro nenhum, só repassa ou omite o parâmetro; garantir que
omite de verdade, e não manda `turmaId=`.

## Fora de escopo

- As telas — cards `05`/`06`/`07`.
- Reprocessar cartão — card `09`.
- Cache: o precedente é `cache.wrap`, como o `getSummary` faz, e só se medir lento.

## Critérios de aceite

- [ ] Turma de outro cursinho devolve **403**, não lista vazia
- [ ] `cursinhoId` vem do JWT; nenhum parâmetro de URL consegue trocá-lo
- [ ] Uma requisição = uma consulta de estudantes, não N
- [ ] Estudante sem cartão aparece com `enviouCartao: false`
- [ ] O `aproveitamentoGeral` bate com a média das linhas que têm leitura concluída
- [ ] A média gateia por `status === 'completed'`, não pela presença da nota — cartão falho com nota velha fica de fora
- [ ] Com `turmaId`, a consulta de estudantes continua escopada pelo cursinho — afirmado por teste
- [ ] Estudante soft-deletado não aparece — `deletedAt` é coluna comum, o TypeORM não filtra sozinho
- [ ] As duas contagens aparecem, e `aproveitamentoGeral` é `null` quando ninguém tem leitura
- [ ] `linhasSemEstudanteAtivo` contado, nunca listado
- [ ] `temEstudanteSemTurma` verdadeiro quando houver, no relatório geral
- [ ] As quatro rotas resolvem sem colisão — provado por teste que sobe o app
- [ ] Permissão `gerenciarEstudantes` nas quatro, **fixada por teste** no metadado de cada handler (e conferida à mão no PR)
- [ ] Teste provando o isolamento entre dois cursinhos
