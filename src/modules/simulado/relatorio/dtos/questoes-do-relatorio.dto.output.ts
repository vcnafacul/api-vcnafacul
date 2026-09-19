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
}

export class QuestoesDoRelatorioDtoOutput {
  @ApiProperty({ type: [QuestaoDoRelatorioDtoOutput] })
  questoes: QuestaoDoRelatorioDtoOutput[];
}
