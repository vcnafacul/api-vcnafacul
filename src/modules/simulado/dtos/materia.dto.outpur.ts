import { ApiProperty } from '@nestjs/swagger';

export class MateriaDTO {
  @ApiProperty()
  public _id?: string;

  @ApiProperty()
  public nome: string;
}
