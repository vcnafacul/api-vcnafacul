import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateHomeSupporterDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiProperty({ required: false })
  name?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(512)
  @ApiProperty({ required: false })
  link?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  @ApiProperty({ required: false })
  description?: string;
}
