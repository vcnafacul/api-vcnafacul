import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Alternativa } from '../enum/alternativa.enum';
import { EnemArea } from '../enum/enem-area.enum';

export class CreateQuestaoMsSimuladoDTOInput {
  @ApiProperty({ enum: EnemArea })
  @IsEnum(EnemArea)
  public enemArea: EnemArea;

  @ApiProperty({ required: false })
  @IsOptional()
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

  @ApiProperty({ required: false })
  @IsOptional()
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

  @IsBoolean()
  @ApiProperty({ required: false })
  @IsOptional()
  public subjectClassification: boolean = false;

  @IsBoolean()
  @ApiProperty({ required: false })
  @IsOptional()
  public textClassification: boolean = false;

  @IsBoolean()
  @ApiProperty({ required: false })
  @IsOptional()
  public imageClassfication: boolean = false;

  @IsBoolean()
  @ApiProperty({ required: false })
  @IsOptional()
  public alternativeClassfication: boolean = false;

  @IsArray()
  @ApiProperty({ required: false, type: [String], default: [] })
  public files: string[] = [];

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public altA: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public altB: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public altC: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public altD: string;

  @IsString()
  @ApiProperty({ required: false })
  @IsOptional()
  public altE: string;
}
