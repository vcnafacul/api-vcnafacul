import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsString } from 'class-validator';
import { AttendancePeriod } from '../enum/attendance-period.enum';

export class CreateAttendanceRecordDtoInput {
  @ApiProperty()
  @IsString()
  classId: string;

  @ApiProperty()
  @IsDateString()
  date: Date;

  @ApiProperty({ enum: AttendancePeriod })
  @IsEnum(AttendancePeriod)
  period: AttendancePeriod;

  @ApiProperty({ isArray: true, type: String })
  @IsArray()
  studentIds: string[];
}
