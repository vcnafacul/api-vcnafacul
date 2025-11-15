import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Alternativa } from '../enum/alternativa.enum';

export class UpdateImageAlternativaDTOInput {
  @ApiProperty({ enum: Alternativa })
  @IsEnum(Alternativa)
  public alternativa: Alternativa;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  public imageAlternativa?: string | null;
}
