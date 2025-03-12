import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CreateRoleDtoInput } from './create-role.dto';

export class UpdateRoleDtoInput extends PartialType(CreateRoleDtoInput) {
  @IsString()
  @ApiProperty()
  id: string;
}
