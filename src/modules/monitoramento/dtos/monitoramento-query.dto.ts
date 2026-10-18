import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Period } from 'src/modules/user/enum/period';

/** tickets/044 — o recorte é obrigatório nas rotas do monitoramento. */
export class MonitoramentoQueryDto {
  @ApiProperty({ description: 'id do cursinho (partner_prep_course)' })
  @IsUUID()
  cursinhoId: string;
}

export class MonitoramentoPeriodoQueryDto extends MonitoramentoQueryDto {
  @ApiPropertyOptional({ enum: Period, default: Period.month })
  @IsOptional()
  @IsEnum(Period)
  groupBy: Period = Period.month;
}

export class MonitoramentoPerfilQueryDto extends MonitoramentoQueryDto {
  @ApiPropertyOptional({ description: 'Só os papéis base' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  baseOnly = false;
}

/** Últimos processos: sem `cursinhoId`, a plataforma inteira (D7). */
export class UltimosProcessosQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cursinhoId?: string;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limite = 10;
}
