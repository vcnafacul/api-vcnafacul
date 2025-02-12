import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CreateClassDtoInput } from './create-class.dto.input';

export class UpdateClassDTOInput extends PartialType(CreateClassDtoInput) {
  @IsString()
  @ApiProperty()
  _id: string;
}
