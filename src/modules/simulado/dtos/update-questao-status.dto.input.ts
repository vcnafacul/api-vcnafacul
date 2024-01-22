import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStatusDTOInput {
  @IsString()
  @ApiProperty()
  @IsOptional()
  message?: string;
}
