import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { Gender } from '../enum/gender';

export class CompleteProfileDtoInput {
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

  @IsBoolean()
  @ApiProperty()
  lgpd: boolean;
}
