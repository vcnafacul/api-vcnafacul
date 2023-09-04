import {
  IsOptional,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Gender } from '../enum/gender';

export class UpdateUserDTOInput {
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  nome: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  sobrenome: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  telefone: string;

  @IsEnum(Gender)
  @IsOptional()
  genero: Gender;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  nascimento: Date;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  estado: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  cidade: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  sobre: string;
}
