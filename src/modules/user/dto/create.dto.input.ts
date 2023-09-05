import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator';
import { Gender } from '../enum/gender';
import { EmailUnique } from '../validator/email-unique.validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDtoInput {
  @IsEmail()
  @EmailUnique({ message: 'Email already exist' })
  @ApiProperty()
  email: string;

  @MinLength(8)
  @ApiProperty()
  password: string;

  @IsNotEmpty()
  @ApiProperty()
  firstName: string;

  @IsNotEmpty()
  @ApiProperty()
  lastName: string;

  @IsNotEmpty()
  @ApiProperty()
  phone: string;

  @IsEnum(Gender)
  @ApiProperty()
  genero: Gender;

  @IsDateString()
  @ApiProperty()
  birthday: Date;

  @IsNotEmpty()
  @ApiProperty()
  state: string;

  @IsNotEmpty()
  @ApiProperty()
  city: string;

  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  about?: string;
}
