import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { CreateUserDtoInput } from './create.dto.input';

export class UpdateUserDTOInput extends PartialType(
  OmitType(CreateUserDtoInput, ['email', 'password']),
) {
  @IsBoolean()
  @ApiProperty()
  useSocialName: boolean;
}
