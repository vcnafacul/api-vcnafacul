import { ApiProperty } from '@nestjs/swagger';

export class AvailableSimuladoDTOoutput {
  @ApiProperty()
  nome: string;

  @ApiProperty()
  _id: string;
}
