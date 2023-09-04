import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { StatusGeolocation } from '../enum/status-geolocation';

export class ListGeoDTOInput {
  @IsOptional()
  @ApiProperty({ required: false, nullable: true })
  latitude?: number;

  @IsOptional()
  @ApiProperty({ required: false, nullable: true })
  longitude?: number;

  @IsOptional()
  @ApiProperty({ required: false, nullable: true })
  limit?: number;

  @IsOptional()
  @ApiProperty({ required: false, nullable: true })
  offset?: number;

  @IsOptional()
  @ApiProperty({ required: false, enum: StatusGeolocation, default: 1 })
  status: StatusGeolocation;
}
