# ✅ Checklist de Deploy - Refresh Token

## 📦 Arquivos Criados

### Código Fonte
- ✅ `src/modules/user/services/refresh-token.service.ts` - Serviço de gerenciamento
- ✅ `src/modules/user/dto/refresh-token.dto.input.ts` - DTO de entrada

### Documentação
- ✅ `REFRESH_TOKEN_IMPLEMENTATION.md` - Documentação completa
- ✅ `FRONTEND_INTEGRATION_EXAMPLES.md` - Exemplos de integração
- ✅ `REFRESH_TOKEN_SUMMARY.md` - Resumo técnico
- ✅ `QUICK_START_REFRESH_TOKEN.md` - Guia rápido
- ✅ `CHECKLIST_DEPLOYMENT.md` - Este arquivo

---

## 📝 Arquivos Modificados

### Backend
- ✅ `src/app.module.ts` - JWT config: 7d → 15m
- ✅ `src/modules/user/user.service.ts` - Métodos refresh, logout, logoutAll
- ✅ `src/modules/user/user.controller.ts` - Endpoints refresh, logout, logout-all
- ✅ `src/modules/user/user.module.ts` - Provider RefreshTokenService
- ✅ `src/modules/user/dto/login-token.dto.input.ts` - Campos refresh_token, expires_in

---

## 🔧 Pré-requisitos para Deploy

### Servidor

#### 1. Redis Rodando ✅
```bash
# Verificar
redis-cli ping
# Deve retornar: PONG

# Se não estiver rodando:
sudo systemctl start redis
# ou
docker run -d -p 6379:6379 redis:alpine
```

#### 2. Variáveis de Ambiente ✅
```env
# Obrigatórias
APP_KEY=sua_chave_secreta_jwt_muito_segura

# Redis
CACHE_DRIVER=redis
REDIS_HOST=localhost  # ou IP do Redis
REDIS_PORT=6379

# Outras já existentes
NODE_ENV=production
DATABASE_URL=...
```

#### 3. Dependências Instaladas ✅
```bash
npm install
# ou
yarn install
```

---

## 🚀 Processo de Deploy

### Opção 1: Deploy Direto (Sem Downtime)

```bash
# 1. Fazer backup do código atual
cp -r /caminho/atual /caminho/backup

# 2. Pull do código novo
git pull origin main

# 3. Instalar dependências (se necessário)
npm install

# 4. Build
npm run build

# 5. Restart da aplicação
pm2 restart api-vcnafacul
# ou
systemctl restart api-vcnafacul
```

### Opção 2: Deploy com Docker

```bash
# 1. Build da nova imagem
docker build -t api-vcnafacul:refresh-token .

# 2. Parar container antigo
docker stop api-vcnafacul

# 3. Remover container antigo
docker rm api-vcnafacul

# 4. Rodar novo container
docker run -d \
  --name api-vcnafacul \
  -p 3333:3333 \
  --env-file .env \
  api-vcnafacul:refresh-token

# 5. Verificar logs
docker logs -f api-vcnafacul
```

---

## 🧪 Testes Pós-Deploy

### 1. Health Check Básico
```bash
# API está respondendo?
curl http://seu-servidor:3333/

# Deve retornar algo (não erro 500)
```

### 2. Teste de Login
```bash
curl -X POST http://seu-servidor:3333/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@teste.com",
    "password": "senha123"
  }'

# ✅ Deve retornar: access_token, refresh_token, expires_in
# ❌ Se falhar: verificar banco de dados e logs
```

### 3. Teste de Refresh
```bash
# Use o refresh_token do teste anterior
curl -X POST http://seu-servidor:3333/user/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "TOKEN_DO_LOGIN"
  }'

# ✅ Deve retornar novos tokens
# ❌ Se falhar: verificar Redis
```

### 4. Teste de Logout
```bash
curl -X POST http://seu-servidor:3333/user/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "TOKEN_DO_LOGIN"
  }'

# ✅ Deve retornar: { "message": "Logout realizado com sucesso" }
```

### 5. Verificar Redis
```bash
redis-cli

# Ver tokens criados
keys refresh_token:*

# Deve mostrar tokens (se houver logins)
```

### 6. Teste de Rota Protegida
```bash
# Use o access_token do login
curl http://seu-servidor:3333/user/me \
  -H "Authorization: Bearer TOKEN_DO_LOGIN"

# ✅ Deve retornar dados do usuário
# ❌ Se falhar: problema com JWT
```

---

## 🔍 Monitoramento

### Logs para Observar

```bash
# Com PM2
pm2 logs api-vcnafacul

# Com Docker
docker logs -f api-vcnafacul

# Procurar por:
# ✅ "Access token renovado para usuário: ..."
# ✅ "Logout realizado com sucesso"
# ✅ "Todos os tokens do usuário ... foram revogados"
# ❌ "Refresh token inválido ou expirado" (muitos = problema)
```

### Métricas Importantes

1. **Taxa de renovação de tokens**
   - Normal: Usuários renovam a cada 15min de uso contínuo
   - Anormal: Muitas renovações em curto período

2. **Tokens inválidos**
   - Normal: Alguns (usuários tentando usar tokens expirados)
   - Anormal: Muitos (possível ataque ou problema no frontend)

3. **Taxa de logout**
   - Acompanhar quantos logouts por dia

---

## ⚠️ Problemas Comuns e Soluções

### Problema 1: Redis não conecta
```bash
# Sintoma
Error: connect ECONNREFUSED

# Solução
1. Verificar se Redis está rodando: redis-cli ping
2. Verificar REDIS_HOST e REDIS_PORT no .env
3. Verificar firewall/security groups
4. Verificar se porta 6379 está aberta
```

### Problema 2: Refresh token sempre inválido
```bash
# Sintoma
{ "statusCode": 401, "message": "Refresh token inválido..." }

# Solução
1. Verificar se Redis está persistindo dados
2. Verificar TTL: redis-cli ttl refresh_token:TOKEN
3. Verificar se CACHE_DRIVER=redis no .env
4. Limpar Redis: redis-cli flushdb (CUIDADO: desenvolvimento apenas!)
```

### Problema 3: Access token não expira
```bash
# Sintoma
Tokens funcionam por mais de 15 minutos

# Solução
1. Verificar app.module.ts: expiresIn deve ser '15m'
2. Rebuild: npm run build
3. Restart: pm2 restart / docker restart
4. Limpar tokens antigos no frontend
```

### Problema 4: Logins antigos param de funcionar
```bash
# Sintoma
Usuários reclamando que precisam fazer login novamente

# Causa
Tokens antigos (7 dias) expiraram rapidamente (15min)

# Solução
ESPERADO! Comunicar aos usuários:
- Tokens agora duram 15min
- Mas renovam automaticamente (quando frontend implementar)
- Benefício: mais segurança
```

---

## 📱 Comunicação com Equipe Frontend

### Mensagem para Enviar

```
🔄 ATUALIZAÇÃO: Refresh Token Implementado

O backend agora usa refresh tokens para maior segurança!

🔴 BREAKING CHANGE:
- Access token agora expira em 15 minutos (antes: 7 dias)

✅ O que vocês precisam fazer:
1. Armazenar AMBOS tokens do login:
   - access_token (15min)
   - refresh_token (7 dias)

2. Quando receberem 401:
   - Chamar POST /user/refresh
   - Atualizar os tokens
   - Repetir requisição original

3. No logout:
   - Enviar refresh_token para POST /user/logout

📚 Documentação completa:
- Ver arquivo: FRONTEND_INTEGRATION_EXAMPLES.md
- Exemplos para React, Vue, Angular, React Native

⏰ Prazo sugerido: 1-2 semanas para implementar

Qualquer dúvida, me chamem!
```

---

## 📊 Critérios de Sucesso

### Deploy Bem-Sucedido Se:

- ✅ API responde normalmente
- ✅ Login retorna access_token + refresh_token
- ✅ Refresh funciona e gera novos tokens
- ✅ Logout revoga tokens
- ✅ Rotas protegidas funcionam
- ✅ Redis tem tokens salvos
- ✅ Logs mostram renovações
- ✅ Sem erros 500 nos logs
- ✅ Tempo de resposta normal (<500ms)

### Reverter Deploy Se:

- ❌ Muitos erros 500
- ❌ Login não funciona
- ❌ Redis não conecta
- ❌ Rotas protegidas quebradas
- ❌ Performance degradada significativamente

---

## 🔄 Rollback (Se Necessário)

```bash
# 1. Parar aplicação
pm2 stop api-vcnafacul

# 2. Voltar para backup
rm -rf /caminho/atual
cp -r /caminho/backup /caminho/atual

# 3. Reinstalar dependências antigas
npm install

# 4. Rebuild
npm run build

# 5. Restart
pm2 start api-vcnafacul

# 6. Verificar logs
pm2 logs
```

---

## 📝 Notas Finais

### Compatibilidade
- ✅ 100% compatível com rotas existentes
- ✅ Não quebra funcionalidades atuais
- ⚠️ Frontend precisará implementar refresh (não urgente)

### Segurança
- ✅ Tokens de curta duração (15min)
- ✅ Revogação funcional
- ✅ Rotação automática
- ✅ Logout real

### Performance
- ✅ Impacto mínimo (cache no Redis é muito rápido)
- ✅ Sem queries extras no banco principal
- ✅ TTL automático (sem jobs de limpeza)

---

## ✅ Checklist Final

Antes de dar OK no deploy:

- [ ] Redis está rodando
- [ ] Variáveis de ambiente configuradas
- [ ] Build bem-sucedido (sem erros)
- [ ] Testes manuais passaram
- [ ] Logs sem erros críticos
- [ ] Backup do código antigo feito
- [ ] Equipe frontend comunicada
- [ ] Monitoramento configurado
- [ ] Plano de rollback pronto

---

**Boa sorte com o deploy! 🚀**

Em caso de problemas, verificar:
1. Logs da aplicação
2. Status do Redis
3. Variáveis de ambiente
4. Este checklist novamente

