import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
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
