import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetGoogleApiDetailsDTOInput {
  @IsString()
  @ApiProperty()
  placeId: string;
}
