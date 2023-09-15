import { ApiProperty } from '@nestjs/swagger';
import { QuestaoAnswerDTO } from './questao-answer.dto.output';

export class SimuladoAnswerDTO {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  tipo: string;

  @ApiProperty({ type: QuestaoAnswerDTO, isArray: true })
  questoes: QuestaoAnswerDTO[];

  @ApiProperty()
  nome: string;

  @ApiProperty()
  descricao: string;

  @ApiProperty()
  duracao: number;

  @ApiProperty()
  inicio: Date;
}
