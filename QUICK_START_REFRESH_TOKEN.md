# ⚡ Guia Rápido - Refresh Token

## 🎯 O Que Mudou?

### Resposta do Login AGORA Retorna:

```json
{
  "access_token": "...",     // 15 minutos ⏰
  "refresh_token": "...",    // 7 dias 📅
  "expires_in": 900          // segundos
}
```

---

## 🚀 Novos Endpoints

### 1️⃣ Renovar Token
```bash
POST /user/refresh
{
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
}

# Retorna novo par de tokens
```

### 2️⃣ Logout
```bash
POST /user/logout
{
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
}

# Revoga o refresh token
```

### 3️⃣ Logout de Todos Dispositivos
```bash
POST /user/logout-all
Authorization: Bearer {access_token}

# Revoga TODOS os refresh tokens do usuário
```

---

## 💻 Integração Frontend (Mínimo Necessário)

```typescript
// 1. Armazenar ambos tokens no login
localStorage.setItem('access_token', response.access_token);
localStorage.setItem('refresh_token', response.refresh_token);

// 2. Quando receber 401, renovar automaticamente
try {
  // Requisição normal...
} catch (error) {
  if (error.response?.status === 401) {
    // Renovar token
    const newTokens = await fetch('/user/refresh', {
      method: 'POST',
      body: JSON.stringify({ 
        refresh_token: localStorage.getItem('refresh_token') 
      })
    });
    
    // Atualizar tokens
    localStorage.setItem('access_token', newTokens.access_token);
    localStorage.setItem('refresh_token', newTokens.refresh_token);
    
    // Repetir requisição original
  }
}

// 3. Logout
await fetch('/user/logout', {
  method: 'POST',
  body: JSON.stringify({ 
    refresh_token: localStorage.getItem('refresh_token') 
  })
});
localStorage.clear();
```

---

## 🔍 Como Testar Agora

```bash
# 1. Login
curl -X POST http://localhost:3333/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","password":"suasenha"}'

# Copie o refresh_token da resposta

# 2. Renovar (após 15 min ou quando quiser)
curl -X POST http://localhost:3333/user/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"COLE_AQUI_O_TOKEN"}'

# 3. Logout
curl -X POST http://localhost:3333/user/logout \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"COLE_AQUI_O_TOKEN"}'
```

---

## ⚠️ Importante Para o Frontend

### ❌ NÃO FAZER:
- Ignorar o `refresh_token` do login
- Fazer logout sem enviar o `refresh_token`
- Não implementar renovação automática

### ✅ FAZER:
- Armazenar os dois tokens
- Implementar interceptor de renovação
- Enviar `refresh_token` no logout

---

## 📚 Documentação Completa

- **Implementação Detalhada:** `REFRESH_TOKEN_IMPLEMENTATION.md`
- **Exemplos Frontend:** `FRONTEND_INTEGRATION_EXAMPLES.md`
- **Resumo Técnico:** `REFRESH_TOKEN_SUMMARY.md`

---

## ❓ FAQ Rápido

**P: Posso continuar usando sem implementar o refresh?**
R: Sim, mas o access token expira em 15 minutos agora. Usuários terão que fazer login novamente.

**P: O refresh token expira?**
R: Sim, após 7 dias. Usuário terá que fazer login novamente.

**P: O refresh token é rotacionado?**
R: Sim! A cada renovação, um novo refresh token é gerado e o antigo é revogado (segurança).

**P: Preciso atualizar o Redis?**
R: Não! Usa o Redis já configurado via `CacheService`.

**P: Funciona com o código existente?**
R: Sim! Totalmente compatível. Rotas existentes continuam funcionando normalmente.

---

## 🆘 Problemas Comuns

### "Refresh token inválido ou expirado"
- Token já foi usado (rotação)
- Token passou de 7 dias
- Usuário fez logout
- Redis foi limpo

**Solução:** Redirecionar para login

### "User not found"
- Usuário foi deletado após login
- ID inválido

**Solução:** Limpar storage e redirecionar para login

### Access token expirando muito rápido
- Esperado! É 15 minutos agora
- Implementar renovação automática no frontend

---

## 🎉 Pronto!

Seu backend agora tem refresh tokens funcionando!

**Próximo passo:** Atualizar o frontend para usar os novos tokens.

Ver exemplos completos em `FRONTEND_INTEGRATION_EXAMPLES.md`

