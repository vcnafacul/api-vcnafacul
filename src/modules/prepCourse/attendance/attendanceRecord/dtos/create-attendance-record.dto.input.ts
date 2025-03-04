import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsString } from 'class-validator';

export class CreateAttendanceRecordDtoInput {
  @ApiProperty()
  @IsString()
  classId: string;

  @ApiProperty()
  @IsDateString()
  date: Date;

  @ApiProperty({ isArray: true, type: String })
  @IsArray()
  studentIds: string[];
}
