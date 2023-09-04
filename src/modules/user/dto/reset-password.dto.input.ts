import { ApiProperty } from '@nestjs/swagger';
import { MinLength } from 'class-validator';

export class ResetPasswordDtoInput {
  @MinLength(8)
  @ApiProperty()
  password: string;
}
