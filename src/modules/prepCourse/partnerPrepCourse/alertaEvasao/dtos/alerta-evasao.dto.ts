import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min, ValidateIf } from 'class-validator';

export class SalvarAlertaEvasaoDtoInput {
  @ApiProperty({
    nullable: true,
    description: '% de faltas (1–100) que acende o alerta; null desliga',
  })
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(100)
  percentual: number | null;

  @ApiProperty({ description: 'Começa a avisar depois de N aulas (1–200)' })
  @IsInt()
  @Min(1)
  @Max(200)
  minimoDeAulas: number;
}

export type AlertaEvasao = {
  percentual: number | null;
  minimoDeAulas: number;
};
