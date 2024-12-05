import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReportMapHome {
  @ApiProperty()
  @IsString()
  entity: string;

  @ApiProperty()
  @IsString()
  entityId: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty()
  @IsOptional()
  userId?: string;

  @ApiProperty()
  @IsOptional()
  adrress: boolean = false;

  @ApiProperty()
  @IsOptional()
  contact: boolean = false;

  @ApiProperty()
  @IsOptional()
  other: boolean = false;
}
