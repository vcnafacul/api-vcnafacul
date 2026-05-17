import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateHomeAboutDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiProperty({ required: false, description: 'YouTube video ID' })
  videoUrl?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false, description: 'Markdown description' })
  description?: string;
}
