import { ApiProperty } from '@nestjs/swagger';

export class PontoDaSerieDtoOutput {
  @ApiProperty() simuladoId: string;

  /** ⚠️ `null` quando o simulado foi apagado depois do vínculo. */
  @ApiProperty({ required: true, nullable: true }) nome: string | null;

  /** Fração de 0 a 1 — a tela é quem formata. */
  @ApiProperty() aproveitamento: number;

  /**
   * ⚠️ **Opcional**: histórico anterior ao card 08 não conta os acertos, e
   * derivar de `aproveitamento × total` produz 44 onde o aluno fez 45.
   */
  @ApiProperty({ required: false }) acertos?: number;

  /**
   * Quando o cartão entrou no recorte, em ISO.
   *
   * ⚠️ **NÃO é "data da prova"** — ela não existe no modelo. É o mesmo campo
   * que o `ultimoEnvio` usa, e quem rotula na tela tem de dizer o que é.
   */
  @ApiProperty() em: string;

  /**
   * A média do MESMO recorte naquele simulado — a linha da turma.
   *
   * ⚠️ **Vem junto de propósito** (card 17): dois simulados de dificuldade
   * diferente não se comparam por percentual bruto. Cair de 62% para 55% pode
   * ser MELHORA, se o segundo foi muito mais difícil — e com as duas linhas no
   * mesmo gráfico isso se lê sem normalizar nada.
   *
   * ⚠️ **A linha do aluno sozinha é o gráfico que mais convida à conclusão
   * errada**, e é o padrão em quase toda plataforma de simulado. Mandar a média
   * do servidor é o que impede a tela de desenhá-la sozinha por descuido.
   *
   * ⚠️ `null` quando ninguém mais do recorte tem leitura naquele simulado —
   * nunca zero, que desenharia a turma no chão e o aluno voando.
   */
  @ApiProperty({ required: true, nullable: true })
  mediaDoRecorte: number | null;

  /**
   * Quantos estudantes entraram na média daquele ponto.
   *
   * ⚠️ **Sem ela a linha da turma mente em silêncio:** a média de 27 alunos e a
   * de 2 desenham o mesmo traço. Mesma regra do `MediaPorMateria.base` e do
   * `baseGeral` do card 16.
   */
  @ApiProperty() baseDoRecorte: number;
}

export class SerieDoEstudanteDtoOutput {
  @ApiProperty({ type: [PontoDaSerieDtoOutput] })
  pontos: PontoDaSerieDtoOutput[];
}
