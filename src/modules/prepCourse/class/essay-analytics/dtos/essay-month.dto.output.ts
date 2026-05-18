import { ApiProperty } from '@nestjs/swagger';
import { CompMeans } from './list-essay-months.dto.output';

/**
 * Dados detalhados de redações de uma turma em um mês específico.
 *
 * **Contrato de datas:** `month` é uma string ISO 8601 no formato YYYY-MM-DD;
 * `generatedAt` é um timestamp ISO 8601 completo. A camada de service é
 * responsável por converter `Date` -> ISO string antes de retornar.
 */
export class EssayMonthDtoOutput {
  @ApiProperty() classId: string;
  @ApiProperty() className: string;
  @ApiProperty({ type: String, format: 'date', example: '2026-05-01' })
  month: string;
  @ApiProperty() monthStart: string;
  @ApiProperty() monthEnd: string;
  @ApiProperty() geral: number;
  @ApiProperty({ type: CompMeans }) competencias: CompMeans;
  @ApiProperty() studentsWithAtLeastOneHumanReview: number;
  @ApiProperty() essaysReviewedByHuman: number;
  @ApiProperty() essaysSubmittedTotal: number;
  @ApiProperty() humanReviewRate: number;
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-05-18T12:34:56.000Z',
  })
  generatedAt: string;
}
