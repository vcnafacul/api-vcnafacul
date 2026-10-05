import { ApiProperty } from '@nestjs/swagger';
import { QuestaoDoRelatorioDtoOutput } from './questoes-do-relatorio.dto.output';
import {
  LinhaDoRelatorioDtoOutput,
  ResumoDoRelatorioDtoOutput,
} from './relatorio.dto.output';

/** Um simulado da prova com cartão no recorte (tickets/034). */
export class SimuladoDoRelatorioDtoOutput {
  @ApiProperty() simuladoId: string;

  /** `null` quando o simulado foi apagado depois dos cartões. */
  @ApiProperty({ required: true, nullable: true }) nome: string | null;

  /** Cartões DO RECORTE neste simulado. */
  @ApiProperty() cartoes: number;

  @ApiProperty() totalDeQuestoes: number;
}

/**
 * O resumo do relatório do simulado, mais o que só a prova tem.
 *
 * ⚠️ `simuladoNome` leva o nome da PROVA — é o título do relatório.
 */
export class ResumoDaProvaDtoOutput extends ResumoDoRelatorioDtoOutput {
  @ApiProperty({ type: [SimuladoDoRelatorioDtoOutput] })
  simulados: SimuladoDoRelatorioDtoOutput[];

  /**
   * Todos os simulados com cartão no recorte têm as mesmas questões. `false` =
   * a média junta provas diferentes, e a tela tem de dizer.
   */
  @ApiProperty() mesmasQuestoes: boolean;
}

/**
 * Uma linha por APLICAÇÃO (estudante × simulado); quem não enviou nenhum
 * cartão sai em uma. `resumo.totalNoRecorte` conta estudantes.
 */
export class RelatorioDaProvaDtoOutput {
  @ApiProperty({ type: [LinhaDoRelatorioDtoOutput] })
  linhas: LinhaDoRelatorioDtoOutput[];

  @ApiProperty({ type: ResumoDaProvaDtoOutput })
  resumo: ResumoDaProvaDtoOutput;
}

export class QuestoesDaProvaDtoOutput {
  @ApiProperty({ type: [QuestaoDoRelatorioDtoOutput] })
  questoes: QuestaoDoRelatorioDtoOutput[];

  /** `false` ⇒ a discriminação vem `null` em toda questão. */
  @ApiProperty() mesmasQuestoes: boolean;
}
