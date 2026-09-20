import { ApiProperty } from '@nestjs/swagger';

/** Espelha o `ResultadoDaQuestao` do ms-simulado. */
export type ResultadoDaQuestao = 'acerto' | 'erro' | 'sem_leitura';

export class RespostaDoEstudanteDtoOutput {
  @ApiProperty({ required: true, nullable: true })
  numero: number | null;

  @ApiProperty()
  questaoId: string;

  /** AUSENTE quando não houve leitura — não vazio, não nulo. */
  @ApiProperty({ required: false })
  alternativaEstudante?: string;

  @ApiProperty({ required: false })
  alternativaCorreta?: string;

  @ApiProperty({ enum: ['acerto', 'erro', 'sem_leitura'] })
  resultado: ResultadoDaQuestao;
}

export class DetalheDoEstudanteDtoOutput {
  @ApiProperty()
  status: string;

  /** Já descrita pelo ms — `descricao` e `acaoSugerida` prontas. */
  @ApiProperty({ required: false, type: Object })
  falha?: Record<string, unknown>;

  @ApiProperty({ type: [RespostaDoEstudanteDtoOutput] })
  respostas: RespostaDoEstudanteDtoOutput[];
}
