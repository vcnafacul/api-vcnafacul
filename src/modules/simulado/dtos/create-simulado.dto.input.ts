import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateSimuladoDTOInput {
  @ApiProperty()
  @IsString()
  tipoId: string;
}
