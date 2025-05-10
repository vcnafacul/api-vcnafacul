import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class ApplyJusticationDtoInput {
  @ApiProperty()
  @IsString()
  studentCourseId: string;

  @ApiProperty({ isArray: true, type: String })
  @IsArray()
  attendanceRecordIds: string[];

  @ApiProperty()
  @IsString()
  justification?: string;
}
