import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { StatusGeolocation } from '../enum/status-geolocation';
import { ApiProperty } from '@nestjs/swagger';

export class GeoStatusChangeDTOInput {
  @IsNumber()
  @ApiProperty()
  geoId: number;

  @IsEnum(StatusGeolocation)
  @ApiProperty({ enum: StatusGeolocation })
  status: StatusGeolocation;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  refuseReason: string;
}
