import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Gender } from '../enum/gender';
import { EmailUnique } from '../validator/email-unique.validator';

export class CreateUserDtoInput {
  @IsEmail()
  @EmailUnique({ message: 'Email already exist' })
  @ApiProperty()
  email: string;

  @MinLength(8)
  @ApiProperty()
  password: string;

  @MinLength(8)
  @ApiProperty()
  password_confirmation: string;

  @IsNotEmpty()
  @ApiProperty()
  firstName: string;

  @IsNotEmpty()
  @ApiProperty()
  lastName: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  socialName?: string | undefined;

  @IsNotEmpty()
  @ApiProperty()
  phone: string;

  @IsEnum(Gender)
  @ApiProperty()
  gender: Gender;

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

  @IsBoolean()
  @ApiProperty()
  lgpd: boolean;
}
