# 🔍 Guia de Diagnóstico: Problema com Imagens de Questões em Produção

## 🐛 Bug Crítico Corrigido

Foi identificado e **corrigido um bug crítico** no `BlobModule`:

```typescript
// ❌ ANTES (INCORRETO)
inject: [ConfigService]

// ✅ AGORA (CORRETO)
inject: [EnvService]
```

O módulo estava tentando injetar o `ConfigService` incorreto, o que pode causar falha na inicialização do S3Service em produção.

**⚠️ AÇÃO NECESSÁRIA: Faça o deploy dessa correção imediatamente!**

---

## 🎯 Possíveis Causas do Problema

### 1. **Bug no BlobModule** (Corrigido) ✅
- O serviço não conseguia ler as credenciais do S3 corretamente

### 2. **Cache Corrompido em Produção** 🗄️
- Redis pode ter dados antigos/corrompidos
- TTL de 7 dias pode manter erros em cache

### 3. **Credenciais S3 Incorretas** 🔐
- Access Key ID ou Secret Access Key sem permissões
- Endpoint AWS incorreto
- Bucket não existe ou sem permissões

### 4. **Redis Inacessível** 🔴
- Se `CACHE_DRIVER=redis` mas Redis não está disponível
- Falha silenciosa na conexão

---

## 🛠️ Ferramentas de Diagnóstico Adicionadas

### 1. **Logs Detalhados**

Adicionei logs em `getImage()` que mostrarão:
- ID da imagem sendo buscada
- Nome do bucket
- Se veio do cache ou do S3
- Erros detalhados

**Como ver os logs:**
```bash
# Em produção, verifique os logs da aplicação
kubectl logs -f <nome-do-pod>
# ou
docker logs -f <container-name>
```

### 2. **Endpoint de Teste de Saúde** 🏥

**Endpoint:** `GET /mssimulado/questoes/health/s3-test`

Retorna informações completas sobre:
- ✅ Variáveis de ambiente (sem expor credenciais)
- ✅ Status da conexão com S3
- ✅ Status do cache
- ✅ Mensagens de erro detalhadas

**Exemplo de uso:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api-prod.vcnafacul.com.br/mssimulado/questoes/health/s3-test
```

### 3. **Endpoint para Limpar Cache** 🧹

**Endpoint:** `DELETE /mssimulado/questoes/:id/cache`

Limpa o cache de uma imagem específica.

**Exemplo de uso:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://api-prod.vcnafacul.com.br/mssimulado/questoes/abc123/cache
```

---

## 📋 Checklist de Diagnóstico

### Passo 1: Verifique as Variáveis de Ambiente em Produção

```bash
# Confirme que estas variáveis estão definidas:
✅ BUCKET_QUESTION=simulado-questoes (ou nome correto)
✅ AWS_ENDPOINT=https://...
✅ AWS_REGION=us-east-1 (ou região correta)
✅ AWS_ACCESS_KEY_ID=...
✅ AWS_SECRET_ACCESS_KEY=...
✅ CACHE_DRIVER=redis ou inMemory
```

### Passo 2: Teste a Conexão S3

1. **Chame o endpoint de health check:**
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
     https://api-prod/mssimulado/questoes/health/s3-test
   ```

2. **Analise o resultado:**
   - `status: "HEALTHY"` = Tudo OK ✅
   - `status: "UNHEALTHY"` = Problema identificado ⚠️
   - Verifique `s3.error` e `cache.error` para detalhes

### Passo 3: Verifique os Logs

```bash
# Busque por estas mensagens:
grep "Buscando imagem" logs.txt
grep "Cache miss" logs.txt
grep "Erro ao buscar imagem" logs.txt
```

### Passo 4: Teste com uma Imagem Específica

1. **Tente buscar uma imagem que funciona em homologação:**
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
     https://api-prod/mssimulado/questoes/IMAGE_ID/image
   ```

2. **Se falhar, limpe o cache e tente novamente:**
   ```bash
   curl -X DELETE -H "Authorization: Bearer TOKEN" \
     https://api-prod/mssimulado/questoes/IMAGE_ID/cache
   
   # Tente buscar novamente
   curl -H "Authorization: Bearer TOKEN" \
     https://api-prod/mssimulado/questoes/IMAGE_ID/image
   ```

### Passo 5: Verifique Permissões do Bucket S3

No console AWS/S3:

1. ✅ O bucket `simulado-questoes` existe?
2. ✅ A Access Key tem permissão `s3:GetObject` neste bucket?
3. ✅ As políticas do bucket permitem acesso?

**Exemplo de política necessária:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::simulado-questoes/*"
    }
  ]
}
```

### Passo 6: Teste o Redis (se usar cache Redis)

```bash
# Conecte ao Redis em produção
redis-cli -h REDIS_HOST -p REDIS_PORT

# Teste comandos básicos
ping
# Deve retornar: PONG

# Verifique se há chaves de imagens
keys questao:image:*

# Limpe todas as chaves de imagens (se necessário)
keys questao:image:* | xargs redis-cli del
```

---

## 🔧 Soluções Comuns

### Problema 1: Credenciais S3 Incorretas

**Sintoma:** Erro 403 (Forbidden) ou 401 (Unauthorized)

**Solução:**
1. Gere novas credenciais no AWS IAM
2. Atualize as variáveis `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`
3. Reinicie a aplicação

### Problema 2: Cache Corrompido

**Sintoma:** Funciona sem cache, mas falha com cache

**Solução:**
```bash
# Opção 1: Limpar cache específico via API
curl -X DELETE https://api/mssimulado/questoes/IMAGE_ID/cache

# Opção 2: Limpar todo o Redis
redis-cli FLUSHDB

# Opção 3: Desabilitar cache temporariamente
# Defina CACHE_DRIVER=inMemory
```

### Problema 3: Redis Inacessível

**Sintoma:** Timeout ou conexão recusada

**Solução:**
1. Verifique se o Redis está rodando:
   ```bash
   redis-cli ping
   ```
2. Verifique as variáveis:
   - `REDIS_HOST`
   - `REDIS_PORT`
3. Verifique regras de firewall/security groups

### Problema 4: Bucket Não Existe

**Sintoma:** Erro NoSuchBucket

**Solução:**
1. Crie o bucket no S3
2. Configure as permissões corretas
3. Atualize `BUCKET_QUESTION` se necessário

### Problema 5: Imagem Não Existe no S3

**Sintoma:** Erro 404 (Not Found)

**Solução:**
1. Verifique se a imagem foi realmente enviada para o S3
2. Confirme que o `imageId` no banco está correto
3. Use o upload de imagem novamente:
   ```bash
   curl -X PATCH \
     -H "Authorization: Bearer TOKEN" \
     -F "file=@imagem.jpg" \
     https://api/mssimulado/questoes/ID/image
   ```

---

## 🚀 Deployment

Após as correções:

1. **Faça commit das mudanças:**
   ```bash
   git add .
   git commit -m "fix: corrige bug no BlobModule e adiciona diagnóstico S3"
   git push
   ```

2. **Deploy em produção**

3. **Teste imediatamente:**
   ```bash
   # Teste de saúde
   curl https://api-prod/mssimulado/questoes/health/s3-test
   
   # Teste de imagem
   curl https://api-prod/mssimulado/questoes/IMAGE_ID/image
   ```

4. **Monitore os logs:**
   ```bash
   # Observe os novos logs detalhados
   tail -f logs/application.log | grep "Buscando imagem"
   ```

---

## 📊 Diferenças entre Ambientes

| Item | Local | Homologação | Produção |
|------|-------|-------------|----------|
| Cache | inMemory | Redis? | Redis? |
| S3 | MinIO? | AWS S3 | AWS S3 |
| Credenciais | Dev | Homolog | Prod |
| Bucket | local | simulado-hml | simulado-prod |

**⚠️ IMPORTANTE:** Confirme se as credenciais de produção têm permissões diferentes de homologação!

---

## 📞 Contato

Se o problema persistir após todas estas verificações, colete:

1. ✅ Resposta do endpoint `/health/s3-test`
2. ✅ Logs da aplicação (últimas 50 linhas)
3. ✅ Variáveis de ambiente (SEM EXPOR SECRETS)
4. ✅ ID de uma imagem que funciona em homologação mas não em produção

---

## ✅ Checklist Rápido

- [ ] Deploy da correção do BlobModule
- [ ] Testar endpoint `/health/s3-test`
- [ ] Verificar variáveis de ambiente
- [ ] Confirmar permissões S3
- [ ] Testar busca de imagem
- [ ] Verificar logs detalhados
- [ ] Limpar cache se necessário
- [ ] Confirmar funcionamento

---

**Última atualização:** 2025-11-16

