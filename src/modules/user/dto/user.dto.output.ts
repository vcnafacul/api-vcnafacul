import { IsDateString, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
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
}
