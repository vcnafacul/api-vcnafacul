import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateNewsDtoInput {
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  session?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  title?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    description: 'Data de expiração (YYYY-MM-DD), deve ser hoje ou futura',
    required: false,
  })
  expire_at?: string;
}
