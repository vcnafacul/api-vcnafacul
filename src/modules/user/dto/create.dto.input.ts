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
  nome: string;

  @IsNotEmpty()
  @ApiProperty()
  sobrenome: string;

  @IsNotEmpty()
  @ApiProperty()
  telefone: string;

  @IsEnum(Gender)
  @ApiProperty()
  genero: Gender;

  @IsDateString()
  @ApiProperty()
  nascimento: Date;

  @IsNotEmpty()
  @ApiProperty()
  estado: string;

  @IsNotEmpty()
  @ApiProperty()
  cidade: string;

  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ required: false })
  sobre: string;
}
