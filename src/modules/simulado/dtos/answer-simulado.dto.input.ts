import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Answer } from './answer.dto.input';

export class AnswerSimulado {
  @ApiProperty()
  @IsString()
  idSimulado: string;

  @ApiProperty({ type: Answer, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Answer)
  respostas: Answer[];

  @ApiProperty()
  @IsNumber()
  tempoRealizado: number;
}
