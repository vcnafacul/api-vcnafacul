import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { EdicaoProva } from '../../enum/edicao-prova.enum';

export class CreateProvaDTOInput {
  @ApiProperty({
    enum: EdicaoProva,
    required: false,
    default: EdicaoProva.Regular,
  })
  @IsOptional()
  @IsEnum(EdicaoProva)
  public edicao: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumberString()
  public aplicacao: string;

  @ApiProperty()
  @IsString()
  public ano: string;

  @ApiProperty()
  @IsString()
  public exame: string;

  @ApiProperty()
  @IsString()
  tipo: string;
}
