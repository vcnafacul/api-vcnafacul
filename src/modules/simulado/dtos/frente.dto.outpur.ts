import { ApiProperty } from '@nestjs/swagger';

export class FrenteDTO {
  @ApiProperty()
  public _id?: string;

  @ApiProperty()
  public nome: string;
}
