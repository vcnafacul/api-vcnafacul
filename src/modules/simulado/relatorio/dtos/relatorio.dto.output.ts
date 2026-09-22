import { ApiProperty } from '@nestjs/swagger';

export class FrenteDoEstudanteDtoOutput {
  @ApiProperty() id: string;
  @ApiProperty() nome: string;
  /** Fração de 0 a 1, como `aproveitamentoGeral` — a tela é quem formata. */
  @ApiProperty() aproveitamento: number;
}

export class MateriaDoEstudanteDtoOutput {
  @ApiProperty() id: string;
  @ApiProperty() nome: string;
  @ApiProperty() aproveitamento: number;
  @ApiProperty({ type: [FrenteDoEstudanteDtoOutput] })
  frentes: FrenteDoEstudanteDtoOutput[];
}

export class MediaPorMateriaDtoOutput {
  @ApiProperty() id: string;
  @ApiProperty() nome: string;
  @ApiProperty() media: number;

  /**
   * Quantos estudantes entraram NESTA média.
   *
   * ⚠️ **Anda junto com a média, sempre.** "42% em Química" sobre 3 alunos é
   * verdadeiro e inútil sem o "de 3" — e não é o mesmo número para toda
   * matéria: quem não teve questão de Química lida não tem Química no
   * `materias[]` e não entra neste denominador. Mesmo princípio do
   * `indiceDeDificuldade` da aba de questões.
   */
  @ApiProperty() base: number;
}

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
   * Quantas questões o estudante acertou — o número absoluto.
   *
   * Cursinho conversa em acertos ("fiz 61"), e o percentual sozinho esconde o
   * denominador: 58% de 45 e 58% de 180 são confianças diferentes.
   *
   * ⚠️ **Contado no ms, nunca derivado** de `aproveitamentoGeral × total`: a
   * fração arredondada produz 44 onde o aluno fez 45, e ele confere à mão.
   *
   * ⚠️ **AUSENTE, não zero**, sem leitura concluída ou em histórico anterior
   * ao card 08. Zero acertos num cartão lido é ZERO, e é outra coisa.
   */
  @ApiProperty({ required: false }) acertos?: number;

  /**
   * Nota por matéria e frente, vinda do ms. É o que responde "em QUÊ o aluno
   * foi mal" — a pergunta que decide o que o coordenador faz na segunda-feira.
   *
   * ⚠️ **Repassado, nunca recalculado.** A api não refaz nota, pelo mesmo
   * motivo que já não reescreve `aproveitamentoGeral`: o ms é a fonte, e duas
   * contas da mesma coisa divergem na primeira mudança de regra.
   *
   * ⚠️ Ausente, e nunca `[]`: ausência de medida não é medida zero.
   */
  @ApiProperty({ required: false, type: [MateriaDoEstudanteDtoOutput] })
  aproveitamentoPorMateria?: MateriaDoEstudanteDtoOutput[];

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

  /**
   * A nota da turma em cada matéria. É o que o card 07 desenha.
   *
   * ⚠️ **Ausente quando ninguém do recorte tem matéria nenhuma** — `[]` faria
   * a tela desenhar um gráfico vazio afirmando que a turma não tem matérias,
   * que é diferente de não haver leitura.
   */
  @ApiProperty({ required: false, type: [MediaPorMateriaDtoOutput] })
  aproveitamentoPorMateria?: MediaPorMateriaDtoOutput[];

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

  /**
   * Quantas questões o simulado tem — o denominador de `acertos`.
   *
   * ⚠️ **No resumo, não em cada linha**: é propriedade do simulado, não do
   * estudante. `0` quando o simulado não existe mais, ou quando o ms ainda não
   * tem o card 08 — a tela mostra só o percentual.
   */
  @ApiProperty() totalDeQuestoes: number;
}

export class RelatorioDtoOutput {
  @ApiProperty({ type: [LinhaDoRelatorioDtoOutput] })
  linhas: LinhaDoRelatorioDtoOutput[];

  @ApiProperty({ type: ResumoDoRelatorioDtoOutput })
  resumo: ResumoDoRelatorioDtoOutput;
}
