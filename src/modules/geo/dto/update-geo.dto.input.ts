import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CreateGeoDTOInput } from './create-geo.dto.input';

export class UpdateGeoDTOInput extends PartialType(CreateGeoDTOInput) {
  @IsString()
  @ApiProperty()
  id: string;
}
