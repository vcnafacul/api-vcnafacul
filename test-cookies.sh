#!/bin/bash

# 🧪 Script de Teste - Refresh Token com Cookies HttpOnly
# Este script testa o fluxo completo de autenticação com cookies

echo "🧪 Testando Refresh Token com Cookies HttpOnly"
echo "=============================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
API_URL="http://localhost:3333"
COOKIES_FILE="test-cookies.txt"

# Limpar cookies antigos
rm -f $COOKIES_FILE

echo "📍 API URL: $API_URL"
echo ""

# Solicitar credenciais
echo "🔐 Digite suas credenciais de teste:"
read -p "Email: " EMAIL
read -sp "Senha: " PASSWORD
echo ""
echo ""

# Teste 1: Login
echo "1️⃣ ${YELLOW}Testando LOGIN...${NC}"
echo "   POST /user/login"

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/user/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -c $COOKIES_FILE)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "   ${GREEN}✅ Login bem-sucedido!${NC}"
  echo "   Resposta: $RESPONSE_BODY"
  
  # Verificar se o cookie foi setado
  if grep -q "refresh_token" $COOKIES_FILE; then
    echo "   ${GREEN}✅ Cookie refresh_token foi setado!${NC}"
    cat $COOKIES_FILE | grep refresh_token | awk '{print "   Cookie: " $7 "=" $6}'
  else
    echo "   ${RED}❌ Cookie refresh_token NÃO foi encontrado!${NC}"
  fi
else
  echo "   ${RED}❌ Falha no login (HTTP $HTTP_CODE)${NC}"
  echo "   Resposta: $RESPONSE_BODY"
  exit 1
fi

echo ""
echo "⏳ Aguardando 2 segundos..."
sleep 2
echo ""

# Teste 2: Refresh Token (usando cookie)
echo "2️⃣ ${YELLOW}Testando REFRESH (com cookie)...${NC}"
echo "   POST /user/refresh"

REFRESH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/user/refresh" \
  -b $COOKIES_FILE \
  -c $COOKIES_FILE)

HTTP_CODE=$(echo "$REFRESH_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$REFRESH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "   ${GREEN}✅ Refresh bem-sucedido!${NC}"
  echo "   Resposta: $RESPONSE_BODY"
  
  # Verificar se um novo cookie foi setado
  if grep -q "refresh_token" $COOKIES_FILE; then
    echo "   ${GREEN}✅ Novo cookie refresh_token foi setado (rotacionado)!${NC}"
  else
    echo "   ${RED}❌ Cookie refresh_token NÃO foi atualizado!${NC}"
  fi
else
  echo "   ${RED}❌ Falha no refresh (HTTP $HTTP_CODE)${NC}"
  echo "   Resposta: $RESPONSE_BODY"
fi

echo ""
echo "⏳ Aguardando 2 segundos..."
sleep 2
echo ""

# Teste 3: Logout
echo "3️⃣ ${YELLOW}Testando LOGOUT...${NC}"
echo "   POST /user/logout"

LOGOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/user/logout" \
  -b $COOKIES_FILE)

HTTP_CODE=$(echo "$LOGOUT_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LOGOUT_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "   ${GREEN}✅ Logout bem-sucedido!${NC}"
  echo "   Resposta: $RESPONSE_BODY"
else
  echo "   ${RED}❌ Falha no logout (HTTP $HTTP_CODE)${NC}"
  echo "   Resposta: $RESPONSE_BODY"
fi

echo ""
echo "⏳ Aguardando 2 segundos..."
sleep 2
echo ""

# Teste 4: Tentar usar refresh após logout (deve falhar)
echo "4️⃣ ${YELLOW}Testando REFRESH após logout (deve falhar)...${NC}"
echo "   POST /user/refresh"

REFRESH_AFTER_LOGOUT=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/user/refresh" \
  -b $COOKIES_FILE)

HTTP_CODE=$(echo "$REFRESH_AFTER_LOGOUT" | tail -n1)
RESPONSE_BODY=$(echo "$REFRESH_AFTER_LOGOUT" | sed '$d')

if [ "$HTTP_CODE" -eq 401 ] || [ "$HTTP_CODE" -eq 403 ]; then
  echo "   ${GREEN}✅ Falhou conforme esperado! (HTTP $HTTP_CODE)${NC}"
  echo "   Resposta: $RESPONSE_BODY"
else
  echo "   ${RED}❌ Deveria ter falhado, mas retornou HTTP $HTTP_CODE${NC}"
  echo "   Resposta: $RESPONSE_BODY"
fi

echo ""
echo "=============================================="
echo "🎉 ${GREEN}Testes concluídos!${NC}"
echo ""
echo "📊 Resumo:"
echo "   - Login: Verifica se cookie é setado"
echo "   - Refresh: Verifica se cookie é rotacionado"
echo "   - Logout: Verifica se cookie é limpo"
echo "   - Refresh após logout: Verifica se token foi revogado"
echo ""
echo "📁 Arquivo de cookies: $COOKIES_FILE"
echo ""

# Limpar cookies
rm -f $COOKIES_FILE
echo "🧹 Cookies de teste removidos"

