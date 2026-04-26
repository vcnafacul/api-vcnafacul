import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateNewsDtoInput {
  @IsString()
  @ApiProperty()
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  @ApiProperty({
    description: 'Descrição exibida no card destaque (máx 280 chars)',
    required: false,
  })
  description?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @ApiProperty({
    description: 'Se true, define esta novidade como destaque (zera as outras)',
    required: false,
    default: false,
  })
  destaque?: boolean;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    description: 'Data de expiração (YYYY-MM-DD), deve ser hoje ou futura',
    required: false,
  })
  expire_at?: string;
}
