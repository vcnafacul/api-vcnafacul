import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

/** tickets/024, card 04. */
export class SinalizarRevisaoDTOInput {
  @ApiProperty({ minLength: 10, maxLength: 500 })
  @IsString()
  @Length(10, 500, {
    message: 'Explique o motivo em 10 a 500 caracteres.',
  })
  motivo: string;
}
