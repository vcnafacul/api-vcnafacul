import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class ExtendInscriptionCourseDtoInput {
  @ApiProperty()
  @IsDateString()
  endDate: Date;
}
