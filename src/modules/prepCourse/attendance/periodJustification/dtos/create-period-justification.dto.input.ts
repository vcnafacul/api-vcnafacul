import {
  IsDateString,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePeriodJustificationDtoInput {
  @IsUUID()
  @IsNotEmpty()
  studentCourseId: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  justification: string;
}
