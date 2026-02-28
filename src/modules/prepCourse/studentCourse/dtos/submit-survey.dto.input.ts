import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class SubmitSurveyDtoInput {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  areaInterest: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  selectedCourses: string[];
}
