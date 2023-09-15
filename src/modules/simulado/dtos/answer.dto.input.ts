import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { Alternativa } from '../enum/alternativa.enum';

export class Answer {
  @ApiProperty()
  @IsString()
  questao: string;

  @ApiProperty({ enum: Alternativa })
  @IsEnum(Alternativa)
  alternativaEstudante: Alternativa;
}
