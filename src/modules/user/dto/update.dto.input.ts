import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDtoInput } from './create.dto.input';

export class UpdateUserDTOInput extends PartialType(
  OmitType(CreateUserDtoInput, ['email', 'password']),
) {}
