import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateHomeFeatureDto {
  @IsString()
  @MaxLength(255)
  @ApiProperty()
  title: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  description?: string;
}
