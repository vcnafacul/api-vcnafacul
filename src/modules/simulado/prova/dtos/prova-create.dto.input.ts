import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
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
  categoria: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nomeSimulado?: string;

  /**
   * "Aplicar novas versões automaticamente" (tickets/023, card 05). Ausente =
   * `false`. Vem do multipart, então chega como string.
   */
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsIn(['true', 'false', true, false])
  receberNovasVersoes?: string | boolean;
}
