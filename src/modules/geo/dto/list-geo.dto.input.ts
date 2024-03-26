import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { StatusGeolocation } from '../enum/status-geolocation';
import { GetAllDtoInput } from 'src/shared/dtos/get-all.dto.input';

export class ListGeoDTOInput extends GetAllDtoInput {
  @IsOptional()
  @ApiProperty({ required: false, nullable: true })
  latitude?: number;

  @IsOptional()
  @ApiProperty({ required: false, nullable: true })
  longitude?: number;

  @IsOptional()
  @ApiProperty({ required: false, enum: StatusGeolocation, default: 1 })
  status: StatusGeolocation;
}
