import {
  Equals,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { Gender } from '../enum/gender';

export class CompleteProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  phone: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsDateString()
  birthday: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  state: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  city: string;

  @IsBoolean()
  @Equals(true, { message: 'LGPD deve ser aceita' })
  lgpd: boolean;
}
