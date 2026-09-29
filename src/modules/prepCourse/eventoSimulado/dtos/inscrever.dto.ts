import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class InscreverDtoInput {
  /** Opcional quando o evento tem uma prova só. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  provaId?: string;
}
