import { IsString } from 'class-validator';
import { CreateQuestaoDTOInput } from './create-questao.dto.input';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class UpdateDTOInput extends PartialType(CreateQuestaoDTOInput) {
  @IsString()
  @ApiProperty()
  id: number;
}
