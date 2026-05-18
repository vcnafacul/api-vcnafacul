import { ApiProperty } from '@nestjs/swagger';

export class CompMeans {
  @ApiProperty() c1: number;
  @ApiProperty() c2: number;
  @ApiProperty() c3: number;
  @ApiProperty() c4: number;
  @ApiProperty() c5: number;
}

/**
 * Informações do período do cursinho associado à turma.
 *
 * **Contrato de datas:** `start` e `end` são strings ISO 8601 no formato
 * YYYY-MM-DD. A camada de service é responsável por converter `Date` ->
 * ISO string antes de retornar.
 */
export class EssayCoursePeriodInfo {
  @ApiProperty({ type: String, format: 'date', example: '2026-01-01' })
  startDate: string;
  @ApiProperty({ type: String, format: 'date', example: '2026-12-31' })
  endDate: string;
  @ApiProperty() isActive: boolean;
}

/**
 * Resumo agregado de um mês de redações.
 *
 * **Contrato de datas:** os campos `month`, `generatedAt` (e `start`/`end` em
 * `EssayCoursePeriodInfo`) são strings ISO 8601. A camada de service é
 * responsável por converter `Date` -> ISO string antes de retornar.
 */
export class EssayMonthSummary {
  @ApiProperty({ type: String, format: 'date', example: '2026-05-01' })
  month: string;
  @ApiProperty() monthStart: string;
  @ApiProperty() monthEnd: string;
  @ApiProperty() geral: number;
  @ApiProperty({ type: CompMeans }) competencias: CompMeans;
  @ApiProperty() studentsWithAtLeastOneHumanReview: number;
  @ApiProperty() essaysReviewedByHuman: number;
  @ApiProperty() essaysSubmittedTotal: number;
  @ApiProperty({
    nullable: true,
    description:
      'Alunos distintos que submeteram pelo menos uma redação no mês. ' +
      'Pode ser null em snapshots gerados antes da introdução do campo.',
  })
  studentsSubmittedTotal: number | null;
  @ApiProperty() humanReviewRate: number;
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-05-18T12:34:56.000Z',
  })
  generatedAt: string;
}

export class ListEssayMonthsDtoOutput {
  @ApiProperty() classId: string;
  @ApiProperty() className: string;
  @ApiProperty({ type: EssayCoursePeriodInfo })
  coursePeriod: EssayCoursePeriodInfo;
  @ApiProperty() totalStudents: number;
  @ApiProperty({ type: [EssayMonthSummary] }) months: EssayMonthSummary[];
}
