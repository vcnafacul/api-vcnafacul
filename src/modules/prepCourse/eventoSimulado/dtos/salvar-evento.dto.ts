import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PROVAS_MAX, TEXTO_MAXIMO_DE_PROVAS } from '../regras-do-evento';

export class SalvarEventoDtoInput {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'O evento precisa de um nome.' })
  @MaxLength(120)
  nome: string;

  /** Texto livre: data e local do presencial. */
  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string | null;

  @ApiProperty()
  @IsDateString()
  inscricoesDe: string;

  @ApiProperty()
  @IsDateString()
  inscricoesAte: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Escolha pelo menos uma prova.' })
  @ArrayMaxSize(PROVAS_MAX, { message: TEXTO_MAXIMO_DE_PROVAS })
  @ArrayUnique()
  @IsMongoId({ each: true })
  provaIds: string[];
}
