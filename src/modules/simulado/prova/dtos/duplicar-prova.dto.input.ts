import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** tickets/027, card 02. */
export class DuplicarProvaDtoInput {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Nome da prova é obrigatório' })
  @MaxLength(200)
  nome: string;
}
