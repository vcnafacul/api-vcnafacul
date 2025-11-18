# 🔄 Guia de Migração - Refresh Token para Cookies

## 📋 Resumo das Mudanças

O refresh token foi migrado de **body JSON** para **cookies httpOnly** para melhorar a segurança.

---

## ⚡ O Que Mudou no Backend?

### ✅ Já Implementado

1. **Cookie Parser** instalado e configurado
2. **CORS** atualizado com `credentials: true`
3. **Endpoints** adaptados para usar cookies:
   - `POST /user/login` - seta refresh_token no cookie
   - `POST /user/refresh` - lê do cookie e atualiza
   - `POST /user/logout` - limpa o cookie

### 🔄 Retrocompatibilidade

Os endpoints **ainda aceitam** `refresh_token` no body como fallback:

```bash
# Método NOVO (recomendado) - via cookie
POST /user/refresh
Cookie: refresh_token=...

# Método ANTIGO (ainda funciona) - via body
POST /user/refresh
{
  "refresh_token": "..."
}
```

**Prioridade:**
1. Cookie `refresh_token` (preferencial)
2. Body `refresh_token` (fallback)

---

## 🚀 Migrando o Frontend

### Web (React, Vue, Angular, etc.)

#### Antes (Antigo)

```typescript
// ❌ ANTIGO - Manual
const login = async (email: string, password: string) => {
  const response = await axios.post('/user/login', { email, password });
  
  localStorage.setItem('access_token', response.data.access_token);
  localStorage.setItem('refresh_token', response.data.refresh_token); // ❌
};

const refresh = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  const response = await axios.post('/user/refresh', {
    refresh_token: refreshToken, // ❌
  });
  
  localStorage.setItem('access_token', response.data.access_token);
  localStorage.setItem('refresh_token', response.data.refresh_token); // ❌
};
```

#### Depois (Novo)

```typescript
// ✅ NOVO - Automático com cookies
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3333',
  withCredentials: true,  // ✅ ADICIONE ISTO
});

const login = async (email: string, password: string) => {
  const response = await api.post('/user/login', { email, password });
  
  // Armazena apenas o access_token
  localStorage.setItem('access_token', response.data.access_token);
  // refresh_token agora está no cookie (automático)! ✅
};

const refresh = async () => {
  // Não precisa pegar refresh_token - está no cookie
  const response = await api.post('/user/refresh'); // ✅ Vazio!
  
  // Atualiza apenas o access_token
  localStorage.setItem('access_token', response.data.access_token);
  // refresh_token é atualizado automaticamente no cookie! ✅
};

const logout = async () => {
  await api.post('/user/logout'); // ✅ Cookie limpo automaticamente
  localStorage.clear();
};
```

---

### Checklist de Migração Frontend

- [ ] Adicionar `withCredentials: true` nas configurações do axios/fetch
- [ ] Remover armazenamento de `refresh_token` no localStorage/sessionStorage
- [ ] Remover envio de `refresh_token` no body das requisições
- [ ] Testar login, refresh e logout
- [ ] Verificar se cookies estão sendo enviados (DevTools → Network → Cookies)

---

## 📱 Mobile (React Native)

### Opção 1: WebView (Recomendado se usar WebView)

```typescript
import { WebView } from 'react-native-webview';

<WebView 
  source={{ uri: 'https://api.vcnafacul.com.br' }}
  sharedCookiesEnabled={true}  // ✅ Habilita cookies
/>
```

### Opção 2: Fallback (Continuar usando body)

```typescript
// Continua funcionando temporariamente
const refresh = async (refreshToken: string) => {
  const response = await fetch('http://localhost:3333/user/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  
  return await response.json();
};
```

⚠️ **Nota**: O fallback via body será mantido por compatibilidade, mas é menos seguro.

---

## 🧪 Como Testar

### 1. Teste Local (DevTools)

1. Abra o DevTools (F12)
2. Vá para **Application** → **Cookies**
3. Faça login
4. Verifique se o cookie `refresh_token` aparece com:
   - ✅ HttpOnly: Yes
   - ✅ Secure: No (desenvolvimento) / Yes (produção)
   - ✅ SameSite: Strict

### 2. Teste com cURL

```bash
# Login e salvar cookies
curl -X POST http://localhost:3333/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","password":"senha"}' \
  -c cookies.txt \
  -v

# Verificar se o cookie foi setado (procure por "Set-Cookie")

# Refresh usando cookies
curl -X POST http://localhost:3333/user/refresh \
  -b cookies.txt \
  -c cookies.txt \
  -v

# Logout
curl -X POST http://localhost:3333/user/logout \
  -b cookies.txt \
  -v
```

### 3. Teste com Postman

1. Faça POST em `/user/login`
2. Vá para a aba **Cookies**
3. Verifique se `refresh_token` está lá
4. Faça POST em `/user/refresh` (cookie é enviado automaticamente)
5. Verifique se um novo cookie foi setado

---

## ⚠️ Problemas Comuns

### Problema 1: Cookie não está sendo enviado

**Causa:** Falta `withCredentials: true` ou `credentials: 'include'`

**Solução:**
```typescript
// Axios
axios.create({ withCredentials: true });

// Fetch
fetch(url, { credentials: 'include' });
```

### Problema 2: CORS bloqueando requisições

**Causa:** Backend não configurado com `credentials: true`

**Solução:** Backend já foi atualizado! Verifique se está rodando a versão mais recente.

### Problema 3: Cookie não aparece no DevTools

**Causa:** Domínio incompatível ou flag `Secure` ativa em HTTP

**Solução:**
- Em desenvolvimento: `NODE_ENV=development` (Secure desabilitado)
- Em produção: Use HTTPS

### Problema 4: "Refresh token não encontrado"

**Causa:** Cookie não foi enviado ou expirou

**Solução:**
1. Verifique se `withCredentials: true` está configurado
2. Verifique se o cookie existe no navegador
3. Verifique se o cookie não expirou (7 dias)

---

## 🔐 Benefícios da Migração

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Segurança XSS** | ❌ Vulnerável | ✅ Protegido |
| **Segurança CSRF** | ❌ Vulnerável | ✅ Protegido |
| **Facilidade** | ⚠️ Manual | ✅ Automático |
| **Vazamento** | ❌ Alto risco | ✅ Baixo risco |

---

## 📚 Recursos Adicionais

- [REFRESH_TOKEN_COOKIES.md](./REFRESH_TOKEN_COOKIES.md) - Documentação completa
- [MDN - HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [OWASP - Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

---

## 🎯 Próximos Passos

1. ✅ Backend atualizado
2. 🔄 Migrar frontend para usar `withCredentials: true`
3. 🧪 Testar em desenvolvimento
4. 🚀 Deploy para produção (com HTTPS)
5. 📱 Avaliar necessidade de fallback para mobile

---

## 💬 Suporte

Se tiver problemas durante a migração:

1. Verifique se `withCredentials: true` está configurado
2. Verifique os cookies no DevTools
3. Teste com cURL para isolar o problema
4. Consulte a documentação completa em `REFRESH_TOKEN_COOKIES.md`

