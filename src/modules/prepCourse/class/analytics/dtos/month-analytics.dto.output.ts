import { ApiProperty } from '@nestjs/swagger';

export class FrenteAnalytics {
  @ApiProperty() id: string;
  @ApiProperty() nome: string;
  @ApiProperty() aproveitamento: number;
  @ApiProperty() studentsContributing: number;
  @ApiProperty() attemptsContributing: number;
}

export class MateriaAnalytics {
  @ApiProperty() id: string;
  @ApiProperty() nome: string;
  @ApiProperty() aproveitamento: number;
  @ApiProperty() studentsContributing: number;
  @ApiProperty() attemptsContributing: number;
  @ApiProperty({ type: [FrenteAnalytics] }) frentes: FrenteAnalytics[];
}

export class MonthAnalyticsDtoOutput {
  @ApiProperty() classId: string;
  @ApiProperty() className: string;
  @ApiProperty() month: string;
  @ApiProperty() monthStart: Date;
  @ApiProperty() monthEnd: Date;
  @ApiProperty() geral: number;
  @ApiProperty() totalAttempts: number;
  @ApiProperty() totalAttemptsCompleted: number;
  @ApiProperty() studentsWithAtLeastOneCompletedAttempt: number;
  @ApiProperty() generatedAt: Date;
  @ApiProperty({ type: [MateriaAnalytics] }) materias: MateriaAnalytics[];
}
