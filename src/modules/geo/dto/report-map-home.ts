import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReportMapHome {
  @ApiProperty()
  @IsString()
  entity: string;

  @ApiProperty()
  @IsOptional()
  updatedBy?: string;

  @ApiProperty()
  @IsString()
  entityId: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty()
  @IsOptional()
  address: boolean;

  @ApiProperty()
  @IsOptional()
  contact: boolean;

  @ApiProperty()
  @IsOptional()
  other: boolean;
}
