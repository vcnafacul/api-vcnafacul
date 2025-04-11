import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class AttendanceRecordByClassInput {
  @ApiPropertyOptional({
    description: 'ID da turma (opcional para relatório geral)',
  })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiProperty({
    description: 'Data de início do relatório',
    example: '2025-04-01',
  })
  @IsDateString()
  startDate: Date;

  @ApiProperty({
    description: 'Data de fim do relatório',
    example: '2025-04-10',
  })
  @IsDateString()
  endDate: Date;
}
