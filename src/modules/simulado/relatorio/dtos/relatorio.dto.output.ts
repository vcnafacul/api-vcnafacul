import { ApiProperty } from '@nestjs/swagger';

export class LinhaDoRelatorioDtoOutput {
  @ApiProperty() usuario: string;

  @ApiProperty() nome: string;

  @ApiProperty() matricula: string;

  @ApiProperty({ required: false, nullable: true }) turmaId: string | null;

  @ApiProperty({ required: false, nullable: true }) turmaNome: string | null;

  /**
   * Explícito, e não inferido da ausência de `historicoId`: quem infere "não
   * enviou" da falta de um campo infere errado mais cedo ou mais tarde. E um
   * `status: 'nao_enviou'` sintético poluiria o enum do ms com um valor que o
   * ms não conhece.
   */
  @ApiProperty() enviouCartao: boolean;

  @ApiProperty({ required: false }) historicoId?: string;

  @ApiProperty({ required: false }) status?: string;

  @ApiProperty({ required: false }) cartaoCode?: string;

  @ApiProperty({ required: false }) questoesRespondidas?: number;

  /** Ausente, não zero, quando não houve leitura concluída. */
  @ApiProperty({ required: false }) aproveitamentoGeral?: number;

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
}

export class ResumoDoRelatorioDtoOutput {
  /** Estudantes matriculados no recorte. */
  @ApiProperty() totalNoRecorte: number;

  /** Denominador da média — só quem teve leitura concluída. */
  @ApiProperty() comLeituraConcluida: number;

  /** `null` quando ninguém teve leitura: zero seria uma nota, e não é. */
  @ApiProperty({ nullable: true }) aproveitamentoGeral: number | null;

  /** Vem do ms. Alimenta o rodapé do relatório por turma. */
  @ApiProperty() totalEstudantesComCartaoNoCursinho: number;

  /** Só faz sentido no relatório geral; a tela avisa quando é verdadeiro. */
  @ApiProperty() temEstudanteSemTurma: boolean;

  /**
   * Linhas do ms sem estudante ativo correspondente — quem saiu do cursinho
   * depois de enviar. Contadas, **nunca listadas**: o nome de quem saiu não é
   * informação que este relatório deva expor. Sem esta contagem os totais
   * param de bater e a leitura natural é "o sistema perdeu cartão".
   */
  @ApiProperty() linhasSemEstudanteAtivo: number;
}

export class RelatorioDtoOutput {
  @ApiProperty({ type: [LinhaDoRelatorioDtoOutput] })
  linhas: LinhaDoRelatorioDtoOutput[];

  @ApiProperty({ type: ResumoDoRelatorioDtoOutput })
  resumo: ResumoDoRelatorioDtoOutput;
}
