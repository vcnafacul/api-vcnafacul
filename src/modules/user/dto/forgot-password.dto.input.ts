import { IsEmail } from 'class-validator';
import { EmailExist } from '../validator/email-exist.validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDtoInput {
  @IsEmail()
  @EmailExist({ message: 'Email not found' })
  @ApiProperty()
  email: string;
}
