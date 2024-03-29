import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { EnemArea } from '../enum/enem-area.enum';
import { Alternativa } from '../enum/alternativa.enum';

export class CreateQuestaoDTOInput {
  @ApiProperty({ enum: EnemArea })
  @IsEnum(EnemArea)
  public enemArea: EnemArea;

  @ApiProperty()
  @IsString()
  public frente1: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  public frente2: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  public frente3: string;

  @ApiProperty()
  @IsString()
  public materia: string;

  @ApiProperty()
  @IsNumber()
  public numero: number;

  @ApiProperty({ required: false })
  @IsOptional()
  public textoQuestao?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  public textoAlternativaA?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  public textoAlternativaB?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  public textoAlternativaC?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  public textoAlternativaD?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  public textoAlternativaE?: string;

  @ApiProperty({ enum: Alternativa })
  @IsEnum(Alternativa)
  public alternativa: Alternativa;

  @ApiProperty()
  @IsString()
  public imageId: string;

  @ApiProperty()
  @IsString()
  public prova: string;
}
