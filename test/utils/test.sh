#!/bin/bash

# Subir o container MySQL
echo "Subindo o container MySQL..."
docker run --name test-mysql -e MYSQL_ROOT_PASSWORD=123456 -e MYSQL_DATABASE=vcnafacul -p 3307:3306 -d mysql

# Instal,ação das dependências
echo "Instalando as dependências..."
yarn global add dotenv-cli

# Aguarde alguns segundos para garantir que o MySQL esteja pronto
echo "Aguardando o MySQL iniciar..."
sleep 10

echo "Criando as tabelas..."
dotenv -e ./test/.env.test -- yarn migration:show
dotenv -e ./test/.env.test -- yarn migration:run

# Executar os testes
echo "Executando os testes..."
dotenv -e ./test/.env.test -- yarn test:local

# Remover o container MySQL após os testes
echo "Removendo o container MySQL..."
docker stop test-mysql
docker rm test-mysql

echo "Testes concluídos."
