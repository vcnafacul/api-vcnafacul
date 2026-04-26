import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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
  @IsIn(['file', 'text'])
  @ApiProperty({
    description: 'Tipo de conteúdo: file (upload) ou text (markdown). Default: file.',
    required: false,
    enum: ['file', 'text'],
    default: 'file',
  })
  contentType?: 'file' | 'text';

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  @ApiProperty({
    description: 'Markdown da novidade (obrigatório quando contentType=text, máx 50000 chars)',
    required: false,
  })
  body?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    description: 'Data de expiração (YYYY-MM-DD), deve ser hoje ou futura',
    required: false,
  })
  expire_at?: string;
}
