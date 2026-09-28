import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ReceberNovasVersoesDTOInput {
  @ApiProperty()
  @IsBoolean()
  valor: boolean;
}
