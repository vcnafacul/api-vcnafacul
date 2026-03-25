---
name: test-attendance
description: Sobe ambiente de teste completo para a funcionalidade de frequência (attendance). Gerencia container MySQL Docker, configura .env, roda migrations, insere seed data e inicia API + Client.
allowed-tools:
  - Bash
  - Read
  - Edit
---

<objective>
Preparar e iniciar um ambiente de teste completo para testar as funcionalidades de frequência (attendance), incluindo Justificativa de Período e Exportação Excel. O fluxo é:

1. Verificar se existe container MySQL de teste rodando → se sim, remover
2. Subir novo container MySQL 8
3. Validar e configurar as variáveis de ambiente (.env) da API para apontar para o MySQL local
4. Rodar migrations
5. Inserir seed data (roles, users, cursinho, turma, estudante)
6. Iniciar API e Client
</objective>

<context>
Diretório base: /Users/fernandoalmeidapinto/Projects/vcnafacul/vcnafacul-3
API: api-vcnafacul (NestJS + TypeORM + MySQL) — porta 3333
Client: client-vcnafacul (React + Vite) — porta 5173

Variáveis MySQL no .env da API:
- MY_HOST=localhost
- MY_PORT=3306
- MY_USER=root
- MY_PASSWORD=123456
- MY_DB_NAME=vcnafacul

Container Docker: test-mysql-attendance (MySQL 8, porta 3306)

Contas de teste:
- Admin: admin@vcnafacul.com.br / Admin@123
- Estudante: estudante@teste.com / Admin@123

Dados de teste:
- Cursinho: Cursinho Teste VcNaFacul
- Turma: Turma A (período 1º Semestre 2026)
- Estudante matriculado: João da Silva Santos (MAT-001)
</context>

<process>

## Fase 1: Cleanup de containers existentes

1. Verifique se existe algum container Docker com nome começando por `test-mysql` rodando:
   ```bash
   docker ps -a --format '{{.Names}}' | grep -E '^test-mysql' || echo "Nenhum container encontrado"
   ```

2. Se encontrar containers, remova-os:
   ```bash
   docker ps -a --format '{{.Names}}' | grep -E '^test-mysql' | xargs docker rm -f 2>/dev/null || true
   ```

3. Verifique também se a porta 3306 está livre:
   ```bash
   lsof -i :3306 | grep LISTEN || echo "Porta 3306 livre"
   ```
   Se estiver ocupada, avise o usuário e pergunte se deve matar o processo.

## Fase 2: Subir container MySQL

1. Suba o container:
   ```bash
   docker run -d \
     --name test-mysql-attendance \
     -e MYSQL_ROOT_PASSWORD=123456 \
     -e MYSQL_DATABASE=vcnafacul \
     -p 3306:3306 \
     mysql:8
   ```

2. Aguarde o MySQL ficar pronto (máximo 30 segundos):
   ```bash
   for i in $(seq 1 30); do
     docker exec test-mysql-attendance mysqladmin ping -h localhost -u root -p123456 --silent 2>/dev/null && echo "MySQL ready!" && break
     [ "$i" -eq 30 ] && echo "ERRO: MySQL não iniciou em 30s" && exit 1
     sleep 1
   done
   ```

## Fase 3: Validar e configurar .env

1. Leia o arquivo `.env` da API:
   ```
   /Users/fernandoalmeidapinto/Projects/vcnafacul/vcnafacul-3/api-vcnafacul/.env
   ```

2. Faça backup do `.env` atual:
   ```bash
   cp /Users/fernandoalmeidapinto/Projects/vcnafacul/vcnafacul-3/api-vcnafacul/.env \
      /Users/fernandoalmeidapinto/Projects/vcnafacul/vcnafacul-3/api-vcnafacul/.env.backup
   ```

3. Valide e atualize as variáveis MySQL no `.env` usando a ferramenta Edit. Os valores corretos são:
   - `MY_HOST=localhost`
   - `MY_PORT=3306`
   - `MY_USER=root`
   - `MY_PASSWORD=123456`
   - `MY_DB_NAME=vcnafacul`

4. Se alguma variável MY_* não existir no .env, adicione-a.

5. Exiba as variáveis configuradas para confirmação do usuário.

## Fase 4: Migrations

1. Rode as migrations:
   ```bash
   cd /Users/fernandoalmeidapinto/Projects/vcnafacul/vcnafacul-3/api-vcnafacul && yarn migration:run
   ```

2. Se falhar, exiba o erro e pergunte ao usuário como proceder.

## Fase 5: Seed data

Execute o script de seed existente via os seguintes comandos SQL no container.
Use `docker exec -i test-mysql-attendance mysql -u root -p123456 vcnafacul` para cada bloco.

**Bloco 1 — Roles (heredoc com aspas simples, sem interpolação):**
```sql
SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO roles (id, name, base,
  validar_cursinho, alterar_permissao, criar_simulado, criar_questao,
  visualizar_questao, validar_questao, upload_news, visualizar_provas,
  cadastrar_provas, visualizar_demanda, upload_demanda, validar_demanda,
  gerenciador_demanda, gerenciar_processo_seletivo, gerenciar_colaboradores,
  gerenciar_turmas, visualizar_turmas, gerenciar_estudantes, visualizar_estudantes,
  gerenciar_permissoes_cursinho, visualizar_minhas_inscricoes,
  gerenciar_formulario_global, gerenciar_temas, revisar_redacoes, revisar_todas_redacoes
) VALUES (
  '00000000-0000-0000-0000-000000000001', 'admin', 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
);

INSERT INTO roles (id, name, base,
  validar_cursinho, alterar_permissao, criar_simulado, criar_questao,
  visualizar_questao, validar_questao, upload_news, visualizar_provas,
  cadastrar_provas, visualizar_demanda, upload_demanda, validar_demanda,
  gerenciador_demanda, gerenciar_processo_seletivo, gerenciar_colaboradores,
  gerenciar_turmas, visualizar_turmas, gerenciar_estudantes, visualizar_estudantes,
  gerenciar_permissoes_cursinho, visualizar_minhas_inscricoes,
  gerenciar_formulario_global, gerenciar_temas, revisar_redacoes, revisar_todas_redacoes
) VALUES (
  '00000000-0000-0000-0000-000000000002', 'aluno', 1,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
);
```

**Bloco 2 — Users (precisa de interpolação para bcrypt hash):**
O hash bcrypt para "Admin@123" é: `$2b$10$JrysThR90bK15ukFXhcA5eYWH3GmRAJfknqOmlI/nR33zO7EmTML.`

```sql
INSERT INTO users (id, email, password, firstName, lastName, phone, gender, birthday, state, city, lgpd, roleId)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'admin@vcnafacul.com.br',
  '$2b$10$JrysThR90bK15ukFXhcA5eYWH3GmRAJfknqOmlI/nR33zO7EmTML.',
  'Admin', 'VcNaFacul',
  '11999999999', 0, '1990-01-01',
  'SP', 'São Paulo', 1,
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO users (id, email, password, firstName, lastName, phone, gender, birthday, state, city, lgpd, roleId)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  'estudante@teste.com',
  '$2b$10$JrysThR90bK15ukFXhcA5eYWH3GmRAJfknqOmlI/nR33zO7EmTML.',
  'João', 'da Silva Santos',
  '11988888888', 0, '2000-06-15',
  'SP', 'São Paulo', 1,
  '00000000-0000-0000-0000-000000000002'
);
```

**IMPORTANTE:** O hash bcrypt contém `$` — use aspas simples no heredoc ou escape corretamente para evitar interpolação do shell.

**Bloco 3 — Demais dados (heredoc com aspas simples):**
```sql
INSERT INTO geolocations (id, latitude, longitude, name, cep, state, city, neighborhood, street,
  user_fullname, user_phone, user_connection, user_email, status, type)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  -23.5505, -46.6333,
  'Cursinho Teste VcNaFacul', '01001-000',
  'SP', 'São Paulo', 'Centro', 'Rua Teste 123',
  'Admin VcNaFacul', '11999999999', 'Representante', 'admin@vcnafacul.com.br',
  1, 0
);

INSERT INTO partner_prep_course (id, geo_id, representative)
VALUES (
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000010'
);

INSERT INTO collaborators (id, user_id, partner_prep_course_id, actived)
VALUES (
  '00000000-0000-0000-0000-000000000040',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000030',
  1
);

INSERT INTO inscription_course (id, name, description, start_date, end_date, actived, expected_opening,
  partner_prep_course_id, requestDocuments, lenght)
VALUES (
  '00000000-0000-0000-0000-000000000050',
  'Processo Seletivo 2026/1', 'Processo seletivo de teste',
  '2026-01-01 00:00:00', '2026-12-31 23:59:59',
  1, 50,
  '00000000-0000-0000-0000-000000000030',
  0, 0
);

INSERT INTO course_periods (id, name, year, startDate, endDate, partner_prep_course_id)
VALUES (
  '00000000-0000-0000-0000-000000000060',
  '1º Semestre 2026', 2026,
  '2026-01-01 00:00:00', '2026-06-30 23:59:59',
  '00000000-0000-0000-0000-000000000030'
);

INSERT INTO classes (id, name, description, partner_prep_course_id, course_period_id)
VALUES (
  '00000000-0000-0000-0000-000000000070',
  'Turma A', 'Turma de teste para frequência',
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000060'
);

INSERT INTO classes_collaborators (class_id, collaborator_id)
VALUES (
  '00000000-0000-0000-0000-000000000070',
  '00000000-0000-0000-0000-000000000040'
);

INSERT INTO student_course (id, user_id, cpf, email, partner_prep_course_id,
  inscriptionCourseId, applicationStatus, cod_enrolled, classId, isFree, selectEnrolled, waitingList,
  documents_done, photo_done, survey_done)
VALUES (
  '00000000-0000-0000-0000-000000000080',
  '00000000-0000-0000-0000-000000000011',
  '12345678901', 'estudante@teste.com',
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000050',
  'Matriculado', 'MAT-001',
  '00000000-0000-0000-0000-000000000070',
  1, 0, 0, 0, 0, 0
);

SET FOREIGN_KEY_CHECKS = 1;
```

## Fase 6: Iniciar serviços

1. Inicie a API em background:
   ```bash
   cd /Users/fernandoalmeidapinto/Projects/vcnafacul/vcnafacul-3/api-vcnafacul && yarn dev
   ```
   Use `run_in_background: true`.

2. Inicie o Client em background:
   ```bash
   cd /Users/fernandoalmeidapinto/Projects/vcnafacul/vcnafacul-3/client-vcnafacul && npm run dev
   ```
   Use `run_in_background: true`.

3. Exiba o resumo final:
   ```
   ============================================
   Ambiente de teste de frequência pronto!

   API:     http://localhost:3333
   Client:  http://localhost:5173
   Swagger: http://localhost:3333/api
   MySQL:   localhost:3306 (container: test-mysql-attendance)

   Login: admin@vcnafacul.com.br / Admin@123

   Dados de teste:
   - Cursinho: Cursinho Teste VcNaFacul
   - Turma: Turma A (1º Semestre 2026)
   - Estudante: João da Silva Santos (MAT-001)

   Para testar:
   1. Faça login como admin
   2. Navegue até Turma A
   3. Clique em João da Silva Santos
   4. Teste: Justificar Período + Relatório Excel

   Para limpar: docker rm -f test-mysql-attendance
   ============================================
   ```
</process>
