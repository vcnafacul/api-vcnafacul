import { ApiProperty } from '@nestjs/swagger';
import { CategoriaDTO } from './categoria.dto.output';
import { QuestaoDTO } from './questao.dto.output';

export class SimuladoDTO {
  @ApiProperty()
  public _id?: string;

  @ApiProperty()
  nome: string;

  @ApiProperty()
  descricao: string;

  @ApiProperty({ type: CategoriaDTO })
  categoria: CategoriaDTO;

  @ApiProperty({ type: QuestaoDTO, isArray: true })
  questoes: QuestaoDTO[];

  @ApiProperty()
  aproveitamento?: number;

  @ApiProperty()
  vezesRespondido?: number;

  @ApiProperty()
  bloqueado?: boolean;
}
