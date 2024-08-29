import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PartnerPrepCourseDtoInput {
  @IsString()
  @ApiProperty()
  geoId: number;

  @IsString()
  @ApiProperty()
  userId: number;
}
