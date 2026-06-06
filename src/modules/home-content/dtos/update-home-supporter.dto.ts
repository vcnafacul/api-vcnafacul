import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

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
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(280)
  @ApiProperty({ required: false, nullable: true })
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false })
  active?: boolean;
}
