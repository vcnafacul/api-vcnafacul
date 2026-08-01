import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class UpdateDisponibilidadeDTO {
  @ApiProperty({ required: false, nullable: true, type: Date })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  disponivelDe?: Date | null;

  @ApiProperty({ required: false, nullable: true, type: Date })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  disponivelAte?: Date | null;
}
