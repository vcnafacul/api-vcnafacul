import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EdicaoProva } from '../../enum/edicao-prova.enum';

/** Card 41 — só o que muda; campo ausente fica como está. */
export class EditarDadosProvaDtoInput {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nome?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt({ message: 'Ano inválido.' })
  @Min(1990, { message: 'Ano inválido.' })
  @Max(2100, { message: 'Ano inválido.' })
  ano?: number;

  @ApiProperty({ enum: EdicaoProva, required: false })
  @IsOptional()
  @IsEnum(EdicaoProva, { message: 'Edição inválida.' })
  edicao?: EdicaoProva;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt({ message: 'Aplicação inválida.' })
  @Min(1, { message: 'Aplicação inválida.' })
  @Max(3, { message: 'Aplicação inválida.' })
  aplicacao?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId({ message: 'Categoria inválida.' })
  categoria?: string;
}
