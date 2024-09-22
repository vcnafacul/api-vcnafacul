import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { Gender } from '../enum/gender';

export class UserDtoOutput {
  @IsString()
  id: string = '';

  @IsNotEmpty()
  firstName: string = '';

  @IsNotEmpty()
  lastName: string = '';

  @IsNotEmpty()
  email: string = '';

  @IsNotEmpty()
  socialName: string = '';

  @IsNotEmpty()
  phone: string = '';

  @IsEnum(Gender)
  gender: Gender = Gender.Other;

  @IsDateString()
  birthday: Date = new Date();

  @IsNotEmpty()
  street: string = '';

  @IsNotEmpty()
  number: number = 0;

  @IsNotEmpty()
  postalCode: string = '';

  @IsNotEmpty()
  complement: string = '';

  @IsNotEmpty()
  neighborhood: string = '';

  @IsNotEmpty()
  state: string = '';

  @IsNotEmpty()
  city: string = '';

  @IsNotEmpty()
  about?: string = '';

  @IsBoolean()
  collaborator: boolean = false;

  @IsString()
  collaboratorDescription?: string = undefined;

  @IsString()
  collaboratorPhoto?: string = undefined;
}
