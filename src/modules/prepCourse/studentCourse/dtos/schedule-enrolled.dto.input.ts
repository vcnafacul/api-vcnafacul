import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class ScheduleEnrolledDtoInput {
  @ApiProperty()
  @IsDateString()
  data_start: Date;

  @ApiProperty()
  @IsDateString()
  data_end: Date;

  @ApiProperty()
  @IsString()
  inscriptionId: string;
}
