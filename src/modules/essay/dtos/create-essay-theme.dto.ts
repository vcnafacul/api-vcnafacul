import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEssayThemeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  motivationalText: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  instruction?: string;

  @ApiProperty()
  @IsDateString()
  weekStart: string;

  @ApiProperty()
  @IsDateString()
  weekEnd: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
