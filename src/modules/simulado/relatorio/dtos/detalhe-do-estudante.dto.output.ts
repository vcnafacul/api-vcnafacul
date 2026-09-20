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

  /**
   * Já descrita pelo ms — `descricao` e `acaoSugerida` prontas.
   *
   * ⚠️ **`Record<string, unknown>` promete menos do que o contrato entrega.**
   * Do outro lado isto é `FalhaDescrita`
   * (`historico/falha/mapa-falha.ts` no ms-simulado), e as duas chaves estão
   * SEMPRE lá quando o objeto existe: `descricao` (string pronta para ler em
   * tela) e `acaoSugerida` (o enum `AcaoSugerida`). O client depende de
   * `descricao` como obrigatória. Fica como `Object` só porque o tipo do ms
   * não é importável daqui (repositórios separados) — a mesma razão de
   * `QuestoesDoRelatorioDtoOutput` existir duas vezes; não é sinal de que o
   * campo seja um saco de chaves livre.
   */
  @ApiProperty({ required: false, type: Object })
  falha?: Record<string, unknown>;

  @ApiProperty({ type: [RespostaDoEstudanteDtoOutput] })
  respostas: RespostaDoEstudanteDtoOutput[];
}
