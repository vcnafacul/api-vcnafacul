# 📚 Você na Facul — API (Gateway)

API principal da plataforma **Você na Facul**, organização sem fins lucrativos que democratiza o acesso ao ensino superior no Brasil.

Este serviço atua como **gateway central**: autentica usuários, expõe os recursos de cursinhos/estudantes e faz proxy HTTP para os microsserviços `ms-simulado` (motor de provas) e `vcnafacul-form` (construtor de formulários).

---

## 🧩 Arquitetura

```
client-vcnafacul  →  api-vcnafacul  →  ms-simulado       (motor de provas)
  (React SPA)       (NestJS gateway)   (NestJS + MongoDB)
                         ↓
                    vcnafacul-form    (construtor de formulários)
                    (NestJS + MongoDB)
```

| Serviço | Stack | Banco | Porta |
|---------|-------|-------|-------|
| **api-vcnafacul** (este) | NestJS 10 + TypeORM | MySQL 8+ | `3333` |
| ms-simulado | NestJS 10 + Mongoose | MongoDB | `3000` |
| vcnafacul-form | NestJS 11 + Mongoose | MongoDB | `3001` |
| client-vcnafacul | React 19 + Vite 6 | — | `5173` |

O frontend fala **apenas** com este gateway. Microsserviços não são expostos diretamente.

---

## 🛠 Tecnologias

- **NestJS 10** (TypeScript)
- **TypeORM** + **MySQL 8+**
- **JWT** (15min) + refresh token em cookie httpOnly
- **Redis / KeyV** (cache)
- **AWS S3 / Cloudflare R2** (BlobStorage)
- **Nodemailer + Handlebars** (e-mails transacionais)
- **Axios** (proxy para microsserviços)
- **Swagger** em `/api`
- **Jest** (unit + e2e) com Docker MySQL

---

## ⚙️ Pré-requisitos

- Node.js 20+
- Yarn
- Docker + Docker Compose (para banco de testes)
- MySQL 8+ (ou container em `:3307` para `test:local`)

---

## 🚀 Setup

```bash
# Instalar dependências
yarn

# Copiar .env de exemplo e preencher as 51 variáveis
cp .env.example .env

# Rodar migrations
yarn migration:run

# Subir em modo watch (porta 3333)
yarn dev
```

Variáveis obrigatórias incluem: conexão MySQL, SMTP, credenciais AWS S3/R2, `SIMULADO_URL` (URL do `ms-simulado`), Redis, webhook do Discord e logging Grafana. Ver `.env.example`.

---

## 📑 Documentação da API

Swagger disponível em:

```
http://localhost:3333/api
```

---

## 🧪 Testes

```bash
# e2e completo: sobe Docker MySQL, roda migrations, testa, derruba
yarn test

# e2e contra MySQL local em :3307 (sem Docker)
yarn test:local

# cobertura
yarn test:cov
```

---

## 🗄 Migrations

```bash
yarn migration:generate -n NomeDaMigration
yarn migration:run
yarn migration:revert
```

---

## 🔀 CI/CD

- `ci-homol.yml` — deploy em homologação ao mergear PR em `develop`
- `ci-prod.yml` — deploy em produção ao publicar tag `v*`

---

## 📄 Licença

MIT.
