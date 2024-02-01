import { ApiProperty } from '@nestjs/swagger';
import { RegraDTO } from './regra.dto.output';

export class TipoSimuladoDTO {
  @ApiProperty()
  public _id: string;

  @ApiProperty()
  public nome: string;

  @ApiProperty()
  public duracao: number;

  @ApiProperty()
  public quantidadeTotalQuestao: number;

  @ApiProperty({ isArray: true, type: RegraDTO })
  public regras: RegraDTO[];
}
