import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateNewsDtoInput {
  @IsString()
  @ApiProperty()
  session: string;

  @IsString()
  @ApiProperty()
  title: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    description: 'Data de expiração (YYYY-MM-DD), deve ser hoje ou futura',
    required: false,
  })
  expire_at?: string;
}
