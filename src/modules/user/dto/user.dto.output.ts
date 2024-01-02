import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { Gender } from '../enum/gender';

export class UserDtoOutput {
  @IsNumber()
  id: number = 0;

  @IsNotEmpty()
  firstName: string = '';

  @IsNotEmpty()
  lastName: string = '';

  @IsNotEmpty()
  phone: string = '';

  @IsEnum(Gender)
  gender: Gender = Gender.Other;

  @IsDateString()
  birthday: Date = new Date();

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
