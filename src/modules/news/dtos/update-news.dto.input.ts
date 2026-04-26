import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateNewsDtoInput {
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  @ApiProperty({ required: false, description: 'Descrição (máx 280 chars)' })
  description?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false })
  destaque?: boolean;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    description: 'Data de expiração (YYYY-MM-DD), deve ser hoje ou futura',
    required: false,
  })
  expire_at?: string;
}
