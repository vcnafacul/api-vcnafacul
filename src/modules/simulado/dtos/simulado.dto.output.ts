import { ApiProperty } from '@nestjs/swagger';
import { CategoriaDTO } from './categoria.dto.output';
import { QuestaoNaContainerDTO } from './questao-na-container.dto';

export class SimuladoDTO {
  @ApiProperty()
  public _id?: string;

  @ApiProperty()
  nome: string;

  @ApiProperty()
  descricao: string;

  @ApiProperty({ type: CategoriaDTO })
  categoria: CategoriaDTO;

  @ApiProperty({ type: QuestaoNaContainerDTO, isArray: true })
  questoes: QuestaoNaContainerDTO[];

  @ApiProperty()
  aproveitamento?: number;

  @ApiProperty()
  vezesRespondido?: number;

  @ApiProperty()
  bloqueado?: boolean;

  @ApiProperty({ required: false, nullable: true })
  disponivelDe?: string | null;

  @ApiProperty({ required: false, nullable: true })
  disponivelAte?: string | null;
}
