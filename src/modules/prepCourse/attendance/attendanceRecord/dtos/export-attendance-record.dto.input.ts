import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExportAttendanceRecordDtoInput {
  @IsUUID()
  @IsNotEmpty()
  classId: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  maxAbsencePercent: number;
}
