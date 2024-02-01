import { IsEnum, IsString } from 'class-validator';
import { ReportEntity } from '../enum/report.enum';
import { ApiProperty } from '@nestjs/swagger';

export class ReportDTO {
  @IsEnum(ReportEntity)
  @ApiProperty({ enum: ReportEntity })
  entity: ReportEntity;
  @IsString()
  @ApiProperty()
  entityId?: string;

  @IsString()
  @ApiProperty()
  message: string;
}
