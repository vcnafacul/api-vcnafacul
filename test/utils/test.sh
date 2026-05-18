#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="test-mysql"
HOST_PORT="3307"
DB_NAME="vcnafacul"
DB_ROOT_PASSWORD="123456"

cleanup() {
  echo "Removendo o container MySQL ($CONTAINER_NAME)..."
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}

# Garante limpeza mesmo em falha (incluindo Ctrl+C)
trap cleanup EXIT

# 1) Remover container com o mesmo nome (rodando ou parado)
if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "Container $CONTAINER_NAME já existe — removendo..."
  docker rm -f "$CONTAINER_NAME" >/dev/null
fi

# 2) Remover qualquer outro container que esteja publicando a porta alvo
PORT_HOLDERS=$(docker ps -a --format '{{.ID}} {{.Names}} {{.Ports}}' | awk -v p="0.0.0.0:${HOST_PORT}->" 'index($0,p){print $1" "$2}')
if [ -n "$PORT_HOLDERS" ]; then
  echo "Removendo containers ocupando a porta $HOST_PORT:"
  echo "$PORT_HOLDERS"
  echo "$PORT_HOLDERS" | awk '{print $1}' | xargs -I{} docker rm -f {} >/dev/null
fi

# 3) Subir container fresh
echo "Subindo o container MySQL ($CONTAINER_NAME) na porta $HOST_PORT..."
docker run --name "$CONTAINER_NAME" \
  -e MYSQL_ROOT_PASSWORD="$DB_ROOT_PASSWORD" \
  -e MYSQL_DATABASE="$DB_NAME" \
  -p "${HOST_PORT}:3306" \
  -d mysql >/dev/null

# 4) Garantir dotenv-cli
echo "Garantindo dotenv-cli..."
if ! command -v dotenv >/dev/null 2>&1; then
  yarn global add dotenv-cli >/dev/null
fi

# 5) Aguardar MySQL responder de fato (healthcheck ativo, sem sleep cego)
echo "Aguardando o MySQL aceitar conexões..."
MAX_WAIT_SECS=120
ELAPSED=0
until docker exec "$CONTAINER_NAME" mysqladmin ping -h 127.0.0.1 -uroot -p"$DB_ROOT_PASSWORD" --silent >/dev/null 2>&1; do
  if [ "$ELAPSED" -ge "$MAX_WAIT_SECS" ]; then
    echo "MySQL não respondeu em ${MAX_WAIT_SECS}s. Logs do container:"
    docker logs "$CONTAINER_NAME" || true
    exit 1
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done
echo "MySQL pronto após ${ELAPSED}s."

# 6) Migrations + testes — sempre com o env de teste, nunca o .env de produção/homol
echo "Rodando migrations..."
dotenv -e ./test/.env.test -- yarn migration:run

echo "Executando os testes com cobertura..."
dotenv -e ./test/.env.test -- yarn jest --config ./test/config/jest-e2e.json --coverage "$@"

echo "Testes concluídos."
