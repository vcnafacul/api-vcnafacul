import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { CreateGeoDTOInput } from './create-geo.dto.input';

export class UpdateGeoDTOInput extends PartialType(CreateGeoDTOInput) {
  @IsNumber()
  @ApiProperty()
  id: number;
}
