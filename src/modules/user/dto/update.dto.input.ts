import {
  IsOptional,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Gender } from '../enum/gender';

export class UpdateUserDTOInput {
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  lastName: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  phone: string;

  @IsEnum(Gender)
  @IsOptional()
  gender: Gender;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  birthday: Date;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  state: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  city: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  about?: string;
}
