import { ApiProperty } from '@nestjs/swagger';
import { Localizacao } from '../enum/localizacao.enum';

export class ExameDTO {
  @ApiProperty()
  public _id?: string;

  @ApiProperty()
  public nome: string;

  @ApiProperty({ enum: Localizacao })
  public localizacao: Localizacao;
}
