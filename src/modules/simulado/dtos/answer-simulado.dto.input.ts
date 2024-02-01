import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Answer } from './answer.dto.input';

export class AnswerSimulado {
  @ApiProperty()
  @IsNumber()
  @IsOptional()
  idEstudante?: number;

  @ApiProperty()
  @IsString()
  idSimulado: string;

  @ApiProperty({ type: Answer, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Answer)
  respostas: Answer[];
}
