# Seed demo (tickets/053)

Monta o "Cursinho Popular Semear" com 3 anos de história (2024–2026: processos, períodos, turmas, alunos,
frequência, formulário e indicadores) em bancos **locais e dedicados**, para gravar o vídeo de apresentação.
Nunca usa o `.env` da api nem o do form.

## Primeira vez
1. `cp scripts/seed-demo/.env.seed-demo.example scripts/seed-demo/.env.seed-demo` e troque `SEED_DEMO_SENHA`.
2. `yarn seed-demo:db` — sobe MySQL (3308), Mongo (27018) e mailpit (8025).
3. `yarn seed-demo:migrate` — cria as tabelas.
4. `yarn dev:demo`, espere "successfully started", Ctrl+C — cria as roles base.
5. `yarn seed:demo` — popula tudo (alguns minutos).

## Para gravar
- Terminal 1: `yarn form:dev:demo` (form na 3334)
- Terminal 2: `yarn dev:demo` (api na 3333)
- Terminal 3: no client, `npm run dev` (5173)
- Login: `fernando@demo.vcnafacul.local` + `SEED_DEMO_SENHA`.
- E-mails enviados pela api aparecem em http://localhost:8025.

⚠️ **Rodou o seed com a api ou o form no ar? Reinicie os dois.** O cache é em memória
(`CACHE_DRIVER=InMemory`): sem reiniciar, as telas mostram o que estava antes do seed.

### O que está pronto para as cenas ao vivo
- **Convocado da 2ª chamada** (processo de 2026): 1 candidato *Convocado para matrícula*, com prazo daqui a
  alguns dias — é o que se confirma ao vivo. Junto dele: 1 na lista de espera, 1 *Em Análise*,
  1 *Indeferido* e 1 *Não declarou interesse*.
- **3 alunos "sumindo" hoje**: matriculados ativos de 2026 que faltaram às últimas chamadas seguidas, sem
  justificativa — aparecem na lista de "sumindo" dos indicadores e na frequência da turma.
- Chamadas vão até **ontem**; hoje fica livre para fazer uma chamada ao vivo. Os indicadores também param
  em ontem (o de hoje é do cron das 23h40).

## Refazer do zero (mesmo resultado)
`yarn seed:demo` — o primeiro passo apaga o que o seed criou. Os nomes saem iguais (seed fixa do faker); as
datas acompanham o dia em que roda (2026 vai até ontem).

Só recalcular indicadores: `yarn seed:demo --so 07`.

Depois de qualquer um dos dois, reinicie a api e o form (ver acima).

## Apagar tudo
`yarn seed-demo:db:down` (remove os volumes).

## Segurança
`ambiente.ts` recusa rodar se `SEED_DEMO` ≠ 1, se MySQL/Mongo não forem localhost, ou se porta/banco não forem
os do demo (MySQL `3308`/`vcnafacul_demo`, Mongo `27018`/`form_demo`). O `00-limpar` confere de novo na conexão
aberta antes de apagar.
`verificar-env.ts` (roda antes de `dev:demo`, `form:dev:demo` e `seed-demo:migrate`) falha se faltar alguma
chave — sem ela, a api/form buscariam o valor no `.env` real.

## Atualizar o formulário
`yarn seed-demo:clonar-formulario --origem '<uri>' [--parceiro <ownerId>]` reescreve `fixtures/formulario.json`
(só leitura na origem); depois refazer `regras`, `respostaBase` e `variacoes` à mão.
