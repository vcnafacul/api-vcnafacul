import { ApiProperty } from '@nestjs/swagger';
import { TipoSimuladoDTO } from './tipo-simulado.dto.output';
import { QuestaoDTO } from './questao.dto.output';

export class SimuladoDTO {
  @ApiProperty()
  public _id?: string;

  @ApiProperty()
  nome: string;

  @ApiProperty()
  descricao: string;

  @ApiProperty()
  tipo: TipoSimuladoDTO;

  @ApiProperty({ type: QuestaoDTO, isArray: true })
  questoes: QuestaoDTO[];

  @ApiProperty()
  aproveitamento?: number;

  @ApiProperty()
  vezesRespondido?: number;

  @ApiProperty()
  bloqueado?: boolean;
}
