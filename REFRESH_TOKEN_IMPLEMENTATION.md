# 🔐 Implementação de Refresh Token

## 📋 Resumo

Foi implementado um sistema completo de **refresh tokens** com as seguintes características:

- ✅ **Access Token**: 15 minutos de validade
- ✅ **Refresh Token**: 7 dias de validade
- ✅ **Armazenamento**: Redis (via CacheService)
- ✅ **Rotação de Tokens**: Gera novo refresh token a cada renovação (segurança)
- ✅ **Revogação**: Logout individual e de todos os dispositivos
- ✅ **Zero Breaking Changes**: Funciona imediatamente sem migrations

---

## 🎯 O Que Foi Implementado

### 1. **Configurações Atualizadas**

#### `app.module.ts`
```typescript
JwtModule.register({
  global: true,
  secret: process.env.APP_KEY,
  signOptions: { expiresIn: '15m' }, // ✅ Alterado de '7d' para '15m'
})
```

### 2. **Novos Arquivos Criados**

#### `src/modules/user/services/refresh-token.service.ts`
Gerencia todo o ciclo de vida dos refresh tokens:
- `generateRefreshToken()` - Gera novo refresh token
- `validateRefreshToken()` - Valida token e retorna userId
- `rotateRefreshToken()` - Rotaciona token (segurança)
- `revokeRefreshToken()` - Revoga token específico
- `revokeAllUserTokens()` - Revoga todos tokens do usuário

#### `src/modules/user/dto/refresh-token.dto.input.ts`
DTO para o endpoint de refresh.

### 3. **Arquivos Modificados**

#### `LoginTokenDTO` - Agora retorna:
```typescript
{
  access_token: string,    // JWT de 15 minutos
  refresh_token: string,   // UUID válido por 7 dias
  expires_in: number       // 900 segundos
}
```

#### `UserService` - Novos métodos:
- `refresh(refreshToken)` - Renova access token
- `logout(refreshToken)` - Faz logout
- `logoutAll(userId)` - Logout de todos dispositivos

#### `UserController` - Novos endpoints:
- `POST /user/refresh` - Renovar access token
- `POST /user/logout` - Fazer logout
- `POST /user/logout-all` - Logout de todos dispositivos (requer auth)

---

## 🚀 Como Usar

### 1. **Login (Não mudou)**

**Requisição:**
```bash
POST /user/login
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

**Resposta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
  "expires_in": 900
}
```

### 2. **Renovar Access Token**

Quando o access token expirar (após 15 minutos), use o refresh token:

**Requisição:**
```bash
POST /user/refresh
Content-Type: application/json

{
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Resposta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "660f9500-f39c-52e5-b827-557766551111",
  "expires_in": 900
}
```

⚠️ **Importante**: O refresh token é **rotacionado** (o antigo é revogado e um novo é gerado).

### 3. **Logout**

**Requisição:**
```bash
POST /user/logout
Content-Type: application/json

{
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Resposta:**
```json
{
  "message": "Logout realizado com sucesso"
}
```

### 4. **Logout de Todos os Dispositivos**

**Requisição:**
```bash
POST /user/logout-all
Authorization: Bearer {access_token}
```

**Resposta:**
```json
{
  "message": "Logout de todos os dispositivos realizado com sucesso"
}
```

---

## 🔧 Integração no Frontend/Mobile

### Fluxo Recomendado

```typescript
// 1. Armazenar tokens após login
localStorage.setItem('access_token', response.access_token);
localStorage.setItem('refresh_token', response.refresh_token);

// 2. Interceptor para requisições
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. Interceptor para renovar token automaticamente
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se receber 401 e não for refresh endpoint
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Tenta renovar o token
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post('/user/refresh', {
          refresh_token: refreshToken,
        });

        // Atualiza os tokens
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);

        // Repete a requisição original
        originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh token expirado/inválido - redirecionar para login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

### React Native / Mobile

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mesma lógica, mas usando AsyncStorage ao invés de localStorage
await AsyncStorage.setItem('access_token', response.access_token);
await AsyncStorage.setItem('refresh_token', response.refresh_token);
```

---

## 🗄️ Armazenamento no Redis

### Estrutura de Chaves

```
# Refresh token individual
refresh_token:{token_id} -> { userId, createdAt, expiresAt }
TTL: 7 dias

# Lista de tokens por usuário (para revogação em massa)
user_refresh_tokens:{user_id} -> [token_id1, token_id2, ...]
TTL: 7 dias
```

### Exemplo:
```
refresh_token:550e8400-e29b-41d4-a716-446655440000
{
  "userId": "abc123",
  "createdAt": 1735689600000,
  "expiresAt": 1736294400000
}
```

---

## 🔒 Recursos de Segurança

### 1. **Rotação de Tokens**
- A cada renovação, o refresh token antigo é **revogado**
- Um novo refresh token é gerado
- Previne reutilização de tokens roubados

### 2. **Detecção de Reutilização**
- Se um refresh token já revogado for usado, retorna erro
- Possível implementar alerta de segurança

### 3. **TTL Automático**
- Redis automaticamente remove tokens expirados
- Não precisa de job de limpeza

### 4. **Revogação Granular**
- Logout individual: revoga apenas o token usado
- Logout all: revoga todos os tokens do usuário

---

## 📊 Monitoramento

### Logs Implementados

```typescript
// Login
this.logger.log('User created: ' + user.id + ' - ' + user.email);

// Refresh
this.logger.log(`Access token renovado para usuário: ${user.id}`);

// Logout
this.logger.log('Logout realizado com sucesso');

// Logout All
this.logger.log(`Todos os tokens do usuário ${userId} foram revogados`);
```

### Métricas Recomendadas

- Taxa de refresh (quantos refreshes por sessão)
- Tentativas de refresh com token inválido (possível ataque)
- Duração média de sessão

---

## 🚨 Tratamento de Erros

### Erros Possíveis

| Erro | Código | Descrição |
|------|--------|-----------|
| Refresh token inválido | 401 | Token não existe no Redis |
| Refresh token expirado | 401 | Token passou de 7 dias |
| Usuário não encontrado | 404 | userId do token não existe mais |

### Exemplo de Resposta de Erro

```json
{
  "statusCode": 401,
  "message": "Refresh token inválido ou expirado"
}
```

---

## 🧪 Testando a Implementação

### 1. Teste Manual com cURL

```bash
# 1. Login
curl -X POST http://localhost:3333/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@teste.com","password":"senha123"}'

# 2. Usar o access token
curl http://localhost:3333/user/me \
  -H "Authorization: Bearer {ACCESS_TOKEN}"

# 3. Aguardar 15 minutos (ou testar com token expirado)

# 4. Renovar com refresh token
curl -X POST http://localhost:3333/user/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"{REFRESH_TOKEN}"}'

# 5. Logout
curl -X POST http://localhost:3333/user/logout \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"{REFRESH_TOKEN}"}'
```

### 2. Verificar no Redis (desenvolvimento)

```bash
# Conectar ao Redis
redis-cli

# Ver todos os refresh tokens
keys refresh_token:*

# Ver um token específico
get refresh_token:550e8400-e29b-41d4-a716-446655440000

# Ver tokens de um usuário
get user_refresh_tokens:abc123

# Limpar todos os tokens (teste)
flushdb
```

---

## 🎭 Compatibilidade

### ✅ Totalmente Compatível:
- Todas as rotas existentes continuam funcionando
- Guards JWT funcionam normalmente
- Não requer alteração em código existente

### ⚠️ Mudanças no Frontend Necessárias:
- Armazenar `refresh_token` retornado no login
- Implementar lógica de renovação automática
- Tratar expiração de tokens adequadamente

### 🔄 Transição Gradual:

1. **Fase 1 (Atual)**: Sistema implementado, access token de 15min
2. **Fase 2**: Atualizar frontend para usar refresh token
3. **Fase 3**: Monitorar erros 401 e ajustar
4. **Fase 4**: Sistema em produção estável

---

## 📝 Variáveis de Ambiente

Nenhuma nova variável necessária! Usa as existentes:

```env
# Já existentes
APP_KEY=sua_chave_secreta_jwt
CACHE_DRIVER=redis  # ou inMemory
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 🎓 Melhores Práticas

### ✅ DO

- Armazenar refresh token de forma segura (HttpOnly cookie ideal)
- Implementar retry automático em caso de 401
- Limpar tokens do storage ao fazer logout
- Monitorar tentativas de uso de tokens inválidos

### ❌ DON'T

- Não armazenar refresh token em variável JavaScript exposta
- Não enviar refresh token em query params
- Não ignorar erros de refresh (sempre redirecionar para login)
- Não fazer refresh preventivo (só quando necessário)

---

## 🚀 Próximos Passos (Opcional)

### Melhorias Futuras

1. **Rate Limiting**
   ```typescript
   // Limitar renovações por IP/usuário
   @Throttle(5, 60) // 5 requisições por minuto
   async refresh() { ... }
   ```

2. **Device Fingerprinting**
   ```typescript
   // Associar token a dispositivo específico
   generateRefreshToken(userId, deviceId, userAgent)
   ```

3. **Notificações de Segurança**
   ```typescript
   // Enviar email quando novo dispositivo faz login
   await emailService.sendNewDeviceAlert(user, deviceInfo);
   ```

4. **Tokens de Curta Duração**
   ```typescript
   // Para operações sensíveis, exigir reautenticação
   const shortLivedToken = jwtService.sign(payload, { expiresIn: '5m' });
   ```

---

## 📞 Suporte

Se encontrar problemas:

1. Verificar logs da aplicação
2. Verificar se Redis está rodando
3. Confirmar variáveis de ambiente
4. Testar endpoints manualmente com cURL

---

**Implementado com ❤️ usando NestJS, Redis e boas práticas de segurança**

