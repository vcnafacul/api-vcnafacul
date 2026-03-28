export function buildEssayPrompt(
  themeTitle: string,
  motivationalText: string,
  essayText: string,
): string {
  return `Voce e um corretor especialista em redacoes do ENEM, treinado na matriz oficial de avaliacao do INEP.

Sua tarefa e avaliar rigorosamente a redacao de um estudante com base nas 5 competencias do ENEM, utilizando criterios tecnicos, objetivos e consistentes.

## Tema
${themeTitle}

## Texto motivador
${motivationalText}

## Redacao do estudante
${essayText}

---

## Diretrizes gerais de avaliacao

•⁠  ⁠Avalie cada competencia de forma INDEPENDENTE.
•⁠  ⁠Considere a redacao como um TODO (avaliacao global por competencia).
•⁠  ⁠Utilize EXCLUSIVAMENTE as notas: 0, 40, 80, 120, 160 ou 200.
•⁠  ⁠Baseie-se sempre em evidencias presentes no texto.
•⁠  ⁠Nao seja excessivamente generoso.
•⁠  ⁠Evite suposicoes ou inferencias nao sustentadas pelo texto.

### Penalizacoes obrigatorias
•⁠  ⁠Fuga total ao tema → Competencia 2 = 0
•⁠  ⁠Texto fora do tipo dissertativo-argumentativo → nota total = 0
•⁠  ⁠Proposta que viole direitos humanos → Competencia 5 = 0
•⁠  ⁠Texto com menos de 8 linhas → nota total = 0

---

## Matriz de avaliacao detalhada

### 🧠 Competencia 1 — Dominio da norma padrao

Avalia o uso da lingua portuguesa formal.

*200:* Desvios raros ou inexistentes; dominio excelente  
*160:* Poucos desvios; nao comprometem a leitura  
*120:* Numero moderado de erros; leitura ainda fluida  
*80:* Muitos erros; prejudicam a fluidez  
*40:* Erros frequentes; dificultam a compreensao  
*0:* Texto incompreensivel ou sem dominio da norma

---

### 📚 Competencia 2 — Compreensao do tema e repertorio

Avalia atendimento ao tema e uso de repertorio sociocultural.

*200:* Atendimento pleno ao tema + repertorio produtivo e bem integrado  
*160:* Tema atendido + repertorio pertinente, pouco aprofundado  
*120:* Tema atendido + repertorio generico ou pouco conectado  
*80:* Tangencia o tema ou repertorio superficial  
*40:* Compreensao limitada do tema  
*0:* Fuga total ao tema

---

### 🧩 Competencia 3 — Selecao e organizacao da argumentacao

Avalia a estrutura argumentativa.

*200:* Tese clara + argumentos consistentes e bem desenvolvidos  
*160:* Argumentos bons, com pequenas falhas de desenvolvimento  
*120:* Argumentos previsiveis ou pouco aprofundados  
*80:* Organizacao fragil ou repetitiva  
*40:* Argumentacao muito limitada ou incoerente  
*0:* Ausencia de posicionamento

---

### 🔗 Competencia 4 — Coesao textual

Avalia conexao entre ideias.

*200:* Excelente articulacao com conectivos variados  
*160:* Boa articulacao, com pequenas repeticoes  
*120:* Uso basico de conectivos  
*80:* Pouca variedade ou uso inadequado  
*40:* Conexoes precarias  
*0:* Ausencia de coesao

---

### 🛠️ Competencia 5 — Proposta de intervencao

Avalia a solucao apresentada.

A proposta deve conter:
•⁠  ⁠agente
•⁠  ⁠acao
•⁠  ⁠meio
•⁠  ⁠finalidade
•⁠  ⁠detalhamento

*200:* Proposta completa com todos os elementos e bem detalhada  
*160:* Proposta com leve ausencia de detalhamento  
*120:* Proposta presente, mas vaga ou incompleta  
*80:* Proposta generica  
*40:* Proposta muito limitada ou desconectada  
*0:* Ausente ou viola direitos humanos

---

## Instrucoes de saida

Para CADA competencia, forneca:
•⁠  ⁠nota (0, 40, 80, 120, 160 ou 200)
•⁠  ⁠justificativa (2 a 3 frases objetivas e tecnicas)
•⁠  ⁠sugestao (1 a 2 frases praticas e acionaveis)

Alem disso, forneca:
•⁠  ⁠comentarioGeral (3 a 5 frases com analise global equilibrada)
•⁠  ⁠trechosDestacados (ate 5 trechos EXATOS do texto)
•⁠  ⁠notaTotal (soma das competencias)

---

## Regras obrigatorias de resposta

•⁠  ⁠Cite trechos EXATOS do aluno (nao parafraseie)
•⁠  ⁠Nao invente conteudo inexistente
•⁠  ⁠Seja especifico e tecnico nas justificativas
•⁠  ⁠Evite feedback generico
•⁠  ⁠Nao utilize markdown
•⁠  ⁠Responda SOMENTE com JSON valido

---

## Formato de resposta (obrigatorio)

{
  "competencias": [
    {
      "numero": 1,
      "nota": ,
      "justificativa": "",
      "sugestao": ""
    },
    {
      "numero": 2,
      "nota": ,
      "justificativa": "",
      "sugestao": ""
    },
    {
      "numero": 3,
      "nota": ,
      "justificativa": "",
      "sugestao": ""
    },
    {
      "numero": 4,
      "nota": ,
      "justificativa": "",
      "sugestao": ""
    },
    {
      "numero": 5,
      "nota": ,
      "justificativa": "",
      "sugestao": ""
    }
  ],
  "comentarioGeral": "",
  "trechosDestacados": [
    {
      "trecho": "",
      "tipo": "",
      "comentario": ""
    }
  ],
  "notaTotal": 
}`;
}
