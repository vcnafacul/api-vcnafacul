# Índices Firestore

O Firestore exige índices compostos para queries que combinam múltiplos campos com `orderBy` ou filtros encadeados. Índices ausentes causam erro 400 em produção.

## Como gerenciar

Os índices ficam em `api-vcnafacul/firestore.indexes.json`. O `firebase.json` aponta para esse arquivo.

### Adicionar um novo índice

1. Edite `api-vcnafacul/firestore.indexes.json` e adicione o índice no array `indexes`:

```json
{
  "collectionGroup": "nome-da-collection",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "campo1", "order": "ASCENDING" },
    { "fieldPath": "campo2", "order": "ASCENDING" },
    { "fieldPath": "campo3", "order": "DESCENDING" }
  ]
}
```

A ordem dos campos importa — deve refletir a ordem dos `where()` e `orderBy()` da query.

2. Faça o deploy do índice:

```bash
cd api-vcnafacul
firebase deploy --only firestore:indexes
```

> O deploy de índices pode levar alguns minutos para construir no console do Firebase.

### Verificar índices existentes

```bash
cd api-vcnafacul
firebase firestore:indexes
```

Ou acesse o [Console do Firebase](https://console.firebase.google.com) → Firestore → Indexes.

### Dica: erro 400 "requires an index"

Quando uma query nova não tem índice, o Firestore retorna um erro com um link direto para criar o índice no console. Dá pra criar por lá manualmente, mas **sempre adicione também no `firestore.indexes.json`** para manter o arquivo sincronizado com o que está em produção.

---

## Índices atuais (`conversations`)

| Campos | Uso |
|--------|-----|
| `userId ASC, status ASC` | Verificar conversa aberta existente |
| `status ASC, lastMessageAt DESC` | Inbox global de suporte (admin) |
| `partnerPrepId ASC, status ASC, lastMessageAt DESC` | Inbox filtrada por cursinho |
| `userId ASC, status ASC, closedAt DESC` | Cooldown global por usuário |
| `userId ASC, status ASC, partnerPrepId ASC, closedAt DESC` | Cooldown por usuário + cursinho |

## Índices atuais (`messages`)

| Campos | Uso |
|--------|-----|
| `conversationId ASC, createdAt ASC` | Listar mensagens de uma conversa |
| `conversationId ASC, conversationUserId ASC, createdAt ASC` | Listar mensagens filtradas por usuário |
