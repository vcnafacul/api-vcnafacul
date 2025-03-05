import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateAttendanceDtoInput {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsBoolean()
  present: boolean;

  @ApiProperty()
  @IsString()
  @IsOptional()
  justification?: string;
}
