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
}

export class QuestoesDoRelatorioDtoOutput {
  @ApiProperty({ type: [QuestaoDoRelatorioDtoOutput] })
  questoes: QuestaoDoRelatorioDtoOutput[];
}
