# 🚀 Introdução

Seja bem-vindo(a) ao guia completo para contribuir com o projeto **Você na Facul**! Estamos felizes por ter você aqui, ajudando a democratizar o acesso à educação de qualidade. 🎓✨

Neste documento você encontrará o passo a passo detalhado para configurar seu ambiente local, realizar suas contribuições e garantir que seu trabalho seja integrado de maneira eficiente e harmoniosa com o restante da comunidade.

---

## 🌟 Por que seguir este tutorial?

Ao seguir este guia, você contribui diretamente para um ambiente colaborativo mais organizado, padronizado e produtivo, garantindo:

- ✅ **Ambiente Padronizado:** Com todos seguindo as mesmas diretrizes, reduzimos conflitos e facilitamos a integração das contribuições.
- 📑 **Fluxo de Trabalho Organizado:** Desde a criação do fork até a abertura do Pull Request, você terá clareza em cada passo, evitando erros comuns.
- 🗣️ **Comunicação Eficiente:** Um fluxo estruturado torna mais simples a revisão do seu código, permitindo feedback rápido e claro dos mantenedores.

---

## 💡 Por que contribuir para um projeto Open Source?

Contribuir para o **Você na Facul** significa participar de uma iniciativa com propósito, gerando impacto positivo real na vida de milhares de estudantes. Além disso, traz inúmeros benefícios pessoais e profissionais:

- 🚀 **Aprendizado e Crescimento:** Aprimore suas habilidades técnicas, conheça novas tecnologias e adquira experiência prática em desenvolvimento colaborativo.
- 🌎 **Impacto Social:** Sua colaboração pode transformar realidades, ajudando estudantes de baixa renda a conquistarem acesso ao ensino superior.
- 🤝 **Networking e Colaboração:** Conecte-se com outros profissionais e entusiastas, amplie sua rede e troque conhecimentos valiosos.
- 🏅 **Reconhecimento Profissional:** Contribuir para projetos open source valoriza seu portfólio e aumenta sua visibilidade no mercado de trabalho.
- 🌟 **Inovação e Criatividade:** Ajude a moldar o futuro da educação, promovendo inovação tecnológica e pedagógica com suas ideias e contribuições.

Este guia é seu primeiro passo para fazer parte dessa história. Estamos aqui para apoiá-lo(a) nessa jornada. Vamos juntos transformar a educação! 💪📚

---

### 🛠️ Passo 1 – Escolhendo o Projeto

A primeira etapa é escolher o projeto no qual você deseja contribuir. Em nossa página principal da organização, você encontrará os 3 principais projetos:

- 🚀 [Front End](https://github.com/vcnafacul/client-vcnafacul)  
- 📚 [Back End API](https://github.com/vcnafacul/api-vcnafacul)  
- 🧪 [MS Simulado](https://github.com/vcnafacul/ms-simulado)

---

### 📌 Passo 2 – Clonando seu Fork

Após escolher o repositório, clique no botão **Fork** localizado no canto superior direito, conforme ilustrado abaixo:

![Criar Fork](image.png)

Configure seu fork de maneira simples na tela seguinte:

![Configurar Fork](image-1.png)

Após a criação, clone o seu fork para sua máquina local:

![Clonar Fork](image-2.png)

Clonar o projeto copia todos os arquivos e histórico do repositório original para seu ambiente local, pronto para você começar a trabalhar.

---

### 🔗 Passo 3 – Confirmando o "origin"

Você precisará sincronizar seu repositório local com o projeto original (**upstream**) e seu fork (**origin**).

Verifique se o remote **origin** está configurado corretamente com:

```bash
git remote -v
```

Se necessário, configure-o com:

```bash
git remote add origin URL_DO_FORK
```
Em caso de dúvidas, consulte a documentação do GitHub sobre gerenciamento de remotes.

---

### 📥 Passo 4 – Adicionando o "upstream"

Acesse seu fork no GitHub e clique no link indicado por forked from.
![alt text](image-3.png)

Dentro do repositório original, clique em <> Code e copie o endereço do projeto.
![alt text](image-4.png)

Adicione o repositório original como upstream:
```bash
git remote add upstream URL_DO_PROJECT
```
Após isso execute:

```bash
git remote -v
```

### 🔄 Passo 5 – Atualizando sua Branch Local

Antes de contribuir, atualize sua branch local com as últimas mudanças:

```bash
git pull upstream develop
```
> ⚠️ Lembre-se: develop é a branch padrão para desenvolvimento.

### 🖥️ Passo 6 – Desenvolvendo sua Contribuição

Agora você já pode começar a desenvolver!

1. Crie uma nova branch:
```bash
git checkout -b BRANCH_NAME
```
2. Desenvolva seu código e faça commits claros e objetivos:
```bash
git commit -m "minha contribuição"
```
3. Envie sua contribuição ao seu fork remoto:
```bash
git push origin BRANCH_NAME
```
> 📌 Dica: Sempre utilize nomes descritivos para suas branches e commits.

### 🎉 Passo 7 – Abrindo seu Pull Request

Ao terminar suas alterações, siga esses passos:

1. Vá à seção Pull Requests do seu fork no GitHub.
2. Clique em New pull request ou siga o aviso automático do GitHub.
3. Selecione sua branch e escolha develop como destino no projeto principal.

![alt text](image-6.png)
4. Clique em **Create pull request** e preencha título e descrição com detalhes claros. Lembre-se de assinar seu PR! Finalize clicando novamente em **Create pull request**.

![alt text](image-7.png)
5. Após criado, associe a Issue relacionada na seção Development.

![alt text](image-8.png)
6. Aguarde a execução das pipelines e a revisão da equipe.

![alt text](image-10.png)

## 🙌 Agora é só aguardar!
Após esses passos, é só aguardar a revisão e aprovação da sua contribuição. Obrigado por participar do Você na Facul e por ajudar a transformar o futuro de milhares de estudantes. Seu esforço faz toda a diferença! 🚀🎓