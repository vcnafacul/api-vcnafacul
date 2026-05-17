import { ApiProperty } from '@nestjs/swagger';

export class MonthSummary {
  @ApiProperty() month: string;
  @ApiProperty() monthStart: Date;
  @ApiProperty() monthEnd: Date;
  @ApiProperty() geral: number;
  @ApiProperty() studentsWithAtLeastOneCompletedAttempt: number;
  @ApiProperty() totalAttemptsCompleted: number;
  @ApiProperty() generatedAt: Date;
}

export class CoursePeriodInfo {
  @ApiProperty() startDate: Date;
  @ApiProperty() endDate: Date;
  @ApiProperty() isActive: boolean;
}

export class ListMonthsDtoOutput {
  @ApiProperty() classId: string;
  @ApiProperty() className: string;
  @ApiProperty() coursePeriod: CoursePeriodInfo;
  @ApiProperty() totalStudents: number;
  @ApiProperty({ type: [MonthSummary] }) months: MonthSummary[];
}
