import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Status } from 'src/modules/simulado/enum/status.enum';

export class GeoStatusChangeDTOInput {
  @IsString()
  @ApiProperty()
  geoId: string;

  @IsEnum(Status)
  @ApiProperty({ enum: Status })
  status: Status;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  refuseReason: string;
}
