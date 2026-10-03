import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ChangeActiveDtoInput {
  /** Estado desejado. Sem ele, alterna (o client antigo não manda corpo). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  actived?: boolean;
}
