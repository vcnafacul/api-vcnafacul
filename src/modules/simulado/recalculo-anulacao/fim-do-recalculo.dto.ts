import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class AfetadoDoRecalculoDto {
  @ApiProperty() @IsString() @MaxLength(36) usuario: string;
  @ApiProperty() @IsString() @Length(24, 24) historicoId: string;
  /** `YYYY-MM` em São Paulo — o mês do agregado da turma. */
  @ApiProperty() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) mes: string;
}

/** O corpo do aviso do ms ao fim do recálculo (tickets/042, card 12 → 14). */
export class FimDoRecalculoDtoInput {
  @ApiProperty() @IsString() @Length(24, 24) jobId: string;
  @ApiProperty() @IsString() @MaxLength(200) provaNome: string;
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  simuladoIds: string[];
  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  numerosAnulados: number[];

  @ApiProperty({ type: [AfetadoDoRecalculoDto] })
  @IsArray()
  @ArrayMaxSize(20000)
  @ValidateNested({ each: true })
  @Type(() => AfetadoDoRecalculoDto)
  afetados: AfetadoDoRecalculoDto[];
}
