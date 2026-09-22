import { ApiProperty } from '@nestjs/swagger';

/**
 * Espelha `QuestaoDoRelatorioDtoOutput` do ms-simulado
 * (`relatorio-simulado-estudante/dtos/questoes-do-relatorio.dto.output.ts`).
 * Não é importável direto — repositório separado — então é redeclarado aqui
 * só para o Swagger: a api repassa o que o ms manda, sem tocar no shape.
 */
export class QuestaoDoRelatorioDtoOutput {
  /** Nulo quando a questão está sem posição, ou o vínculo foi desfeito depois da leitura. */
  @ApiProperty({ required: true, nullable: true })
  numero: number | null;

  @ApiProperty() questaoId: string;

  @ApiProperty() respondentes: number;

  @ApiProperty() acertos: number;

  @ApiProperty() erros: number;

  /** Não marcada e dupla marcação chegam indistinguíveis — não é "em branco". */
  @ApiProperty() semLeitura: number;

  /** Contagem por alternativa A–E, cada chave sempre presente, mesmo com 0. */
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'integer' },
    description:
      'Contagem por alternativa. Chaves A, B, C, D, E — cada uma sempre presente, mesmo com 0.',
  })
  porAlternativa: Record<string, number>;

  /**
   * O gabarito, sem o qual as contagens acima não são interpretáveis: "51%
   * marcaram B" é a turma acertando em peso ou meia turma caindo no mesmo
   * distrator, e são leituras opostas.
   *
   * Vem da cópia gravada em cada resposta no ms — o gabarito que VALEU naquela
   * aplicação, não o da questão hoje.
   *
   * ⚠️ **`null` em dois casos, e a tela não pode presumir qual:** nenhum
   * histórico completo no recorte, ou históricos que DISCORDAM (questão editada
   * entre duas aplicações, ou duplicada no simulado). O ms loga o segundo caso.
   * `null` significa "não sei" — nunca troque por uma letra padrão.
   *
   * ⚠️ Quando não é nulo, vale `porAlternativa[alternativaCorreta] === acertos`.
   */
  @ApiProperty({ required: true, nullable: true })
  alternativaCorreta: string | null;

  /**
   * A correlação ponto-bisserial entre acertar esta questão e a nota da prova:
   * **a questão separa quem sabe de quem não sabe?**
   *
   * É o que a dificuldade sozinha não diz. "22% acertaram" pode ser uma questão
   * difícil e boa — os 22% são quem foi bem na prova inteira — ou uma questão
   * quebrada, em que acertou quem chutou. As ações são opostas.
   *
   * ⚠️ **Negativo é o sinal clássico de gabarito trocado** (os melhores errando
   * mais que os piores). Faixas usuais: `< 0,20` revisar · `≥ 0,30` boa ·
   * negativa suspeita. Quem traduz em rótulo é a tela (card 06).
   *
   * ⚠️ **`null` NÃO é zero.** Zero diria "não separa ninguém"; `null` diz que
   * não há como medir — menos de 10 estudantes com LEITURA da questão (quem não
   * foi lido não entra), ou variância zero. Nunca vem `NaN`, e nunca troque por
   * um número padrão.
   */
  @ApiProperty({ required: true, nullable: true })
  discriminacao: number | null;

  /**
   * Quantos acertaram esta questão na BASE INTEIRA — todos os cursinhos, todas
   * as aplicações, os dois fluxos (card 16).
   *
   * ⚠️ **Outro ESCOPO, não outro cálculo.** `acertos` acima é do recorte deste
   * relatório; este é global. É o que responde a pergunta que o recorte não
   * pode responder: *"minha turma foi mal nesta questão, ou a questão é difícil
   * para todo mundo?"*. 22% da turma contra 24% da base muda a conclusão de
   * "preciso dar essa aula" para "a questão é dura mesmo".
   *
   * ⚠️ **Contagem, e não percentual**, pela mesma razão do `porAlternativa`: o
   * percentual arredondado esconde a base, e a base é metade da informação.
   */
  @ApiProperty() acertosGeral: number;

  /**
   * O denominador de `acertosGeral` — quantas respostas a questão recebeu na
   * base inteira.
   *
   * ⚠️ **Tem de chegar à tela junto do percentual.** "24%" sozinho não diz se
   * são 1.847 respostas ou 12, e as duas leituras são opostas: dificuldade da
   * questão contra ruído. É a tela que decide o piso abaixo do qual não exibe.
   *
   * ⚠️ **Só é confiável depois do card 21 (escrita no ms) E da execução do sync
   * do card 22.** Antes disso o campo contava APRESENTAÇÕES em vez de
   * respostas, e o reprocessamento contava duas vezes — medido em
   * homologação: **0 de 181** questões batiam com o histórico.
   */
  @ApiProperty() baseGeral: number;
}

export class QuestoesDoRelatorioDtoOutput {
  @ApiProperty({ type: [QuestaoDoRelatorioDtoOutput] })
  questoes: QuestaoDoRelatorioDtoOutput[];
}
