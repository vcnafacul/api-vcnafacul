import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** O que o ms-simulado manda quando o resultado do cartão sai (tickets/028). */
export class AvisoDeResultadoDtoInput {
  @ApiProperty() @IsMongoId() historicoId: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(36) userId: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) simulado: string;
  @ApiProperty() @IsInt() @Min(0) total: number;
  @ApiProperty() @IsInt() @Min(0) acertos: number;
  @ApiProperty() @IsInt() @Min(0) erros: number;
  @ApiProperty() @IsInt() @Min(0) emBranco: number;
  @ApiProperty() @IsInt() @Min(0) @Max(100) aproveitamento: number;
}
