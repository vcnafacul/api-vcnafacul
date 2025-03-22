# Introdução

Bem-vindo ao tutorial de contribuição para o projeto **Você na Facul**! Este documento foi criado para orientá-lo, passo a passo, na configuração do ambiente de desenvolvimento e no fluxo de trabalho para contribuir com o nosso projeto. Seguir este tutorial é fundamental para que sua contribuição seja integrada de forma harmoniosa e colaborativa, garantindo um ambiente padronizado e eficiente para todos os envolvidos.

## Por que seguir este tutorial?

Ao seguir este guia, você garante:
- **Ambiente Padronizado:** Adoção de diretrizes comuns que minimizam conflitos e facilitam a integração do seu trabalho.
- **Fluxo de Trabalho Organizado:** Do fork inicial à abertura do Pull Request, o tutorial apresenta um processo claro e consistente, evitando erros comuns.
- **Comunicação Eficiente:** As orientações auxiliam na revisão do seu código e facilitam o feedback dos mantenedores, agilizando o processo de aprovação.

## Por que contribuir para um projeto Open Source?

Contribuir para o **Você na Facul** traz benefícios significativos, tanto para você quanto para a comunidade:

- **Aprendizado e Crescimento:** Trabalhar em um projeto open source permite que você aprimore suas habilidades técnicas, aprenda novas tecnologias e ganhe experiência prática em desenvolvimento colaborativo.
- **Impacto Social:** Este projeto é uma iniciativa social que busca democratizar o acesso à educação de qualidade. Sua contribuição pode transformar a vida de estudantes de baixa renda, ajudando a ampliar oportunidades educacionais.
- **Networking e Colaboração:** Ao participar, você se conecta com outros profissionais e entusiastas, ampliando sua rede de contatos e trocando conhecimentos valiosos.
- **Reconhecimento Profissional:** Contribuir para projetos open source é uma excelente forma de demonstrar suas habilidades e enriquecer seu portfólio, aumentando sua visibilidade no mercado de trabalho.
- **Inovação e Criatividade:** Suas ideias podem ajudar a moldar o futuro da educação e da tecnologia, promovendo inovações que beneficiam toda a comunidade.

Este tutorial é o seu primeiro passo para se integrar à comunidade do **Você na Facul** e contribuir de maneira efetiva. Siga as instruções a seguir e, se precisar de ajuda, não hesite em entrar em contato com a nossa equipe. Juntos, podemos transformar a educação e abrir portas para um futuro melhor!


### Passo 1 - Escolhendo o Projeto

A primeira etapa é escolher o projeto ao qual deseja contribuir. Em nossa página principal da organização, você encontrará os 3 principais projetos:

- 🚀 [Front End](https://github.com/vcnafacul/client-vcnafacul)  
- 📚 [Back End API](https://github.com/vcnafacul/api-vcnafacul)  
- 🧪 [MS Simulado](https://github.com/vcnafacul/ms-simulado)


### Passo 2 - Clonando seu Fork

Após escolher o repositório desejado, clique no botão **Fork** localizado no canto superior direito, conforme ilustrado abaixo:

![Criar Fork](image.png)

Ao clicar em **Fork**, você poderá configurar seu fork de forma simples:

![Configurar Fork](image-1.png)

Depois de criado, você será redirecionado para o seu repositório forkado. Agora, basta clonar o seu fork para sua máquina local:

![Clonar Fork](image-2.png)

Clonar o projeto copia todos os arquivos e o histórico de commits do repositório original para o seu fork, permitindo que você comece a trabalhar localmente.

### Passo 3: Verifique se o seu fork está configurado como "origin"

Você precisará sincronizar seu repositório local tanto com o repositório do projeto original (no GitHub) quanto com o seu fork. As URLs que apontam para esses repositórios são chamadas de "remotes". No nosso fluxo, o repositório original é denominado **upstream** e o seu fork, **origin**.

Ao clonar o seu fork, o Git deve ter configurado automaticamente o remote **origin** com a URL do seu fork. Para verificar, execute:

```bash
git remote -v
```

Você deverá ver a URL do seu fork associada ao nome origin.
Caso não veja o remote origin, adicione-o com o seguinte comando:

```bash
git remote add origin URL_DO_FORK
```

Se encontrar problemas neste passo, consulte a documentação do GitHub sobre gerenciamento de repositórios remotos.

### Passo 4: Adicionar o repositório do projeto como o remoto "upstream"

Acesse o seu fork e clique no link do projeto em **_forked from_**

![alt text](image-3.png)

Dentro do repo do projeto escolhido, clique **<> Code** e  copie o endereço do projeto.

![alt text](image-4.png)

Para adicionar o repositório do projeto como o remoto "upstream", execute:

```bash
git remote add upstream URL_DO_PROJECT
```
Após isso execute:

```bash
git remote -v
```

Você deverá ver dois remotes configurados:

- **origin**: Apontando para o seu fork.
- **upstream**: Apontando para o projeto original.

### Passo 5: Atualiza a branch com a última versão do projeto

Antes de iniciar sua contribuição, é importante garantir que seu fork esteja atualizado com as últimas alterações da branch de desenvolvimento. Para isso, execute:

```bash
git pull upstream develop
```
> Nota: A branch **develop** é a branch default e representa o ambiente de desenvolvimento do projeto.

### Passo 6: Preparando o Ambiente para Desenvolvimento

Nesta etapa, você já está pronto para começar a desenvolver. Logo você já pode

1. Crie uma nova branch para sua contribuição:

```bash
git checkout -b BRANCH_NAME
```
2. Desenvolver seu código e fazer commits:

```bash
git commit -m "my commit"
```
3. Enviar sua branch para o repositório remoto:

```bash
git push origin BRANCH_NAME
```
> Dica: Certifique-se de utilizar nomes de branches e mensagens de commit claros e descritivos.

### Passo 7: Abrindo seu Pull Request (PR)

Após publicar sua branch com a contribuição, siga estes passos:

1. Acesse seu fork no GitHub e vá para a seção Pull Requests.

2. Caso apareça um aviso sugerindo a abertura de um PR, siga a orientação. Se não, clique em New pull request.

3. Selecione sua branch e escolha a branch de destino do projeto, que normalmente é a develop.

![alt text](image-6.png)

4. Clique em **Create pull request**. Na tela que se abrirá, insira um título e uma descrição detalhada para seu PR. Lembre-se de incluir sua assinatura. Finalize clicando no botão abaixo da descrição, **Create pull request**.

![alt text](image-7.png)

5. Após criar o PR, vá para a seção Development e associe a Issue que você está resolvendo.

![alt text](image-8.png)

6. Por fim, confirme que as pipelines necessárias estão sendo executadas e aguarde a aprovação do seu PR.

![alt text](image-10.png)
