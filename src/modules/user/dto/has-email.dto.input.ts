import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { EmailUnique } from '../validator/email-unique.validator';

export class HasEmailDtoInput {
  @IsEmail()
  @EmailUnique({})
  @ApiProperty()
  email: string;
}
