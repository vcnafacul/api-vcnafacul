import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { UserExist } from 'src/modules/user/validator/user-exist.validator';
import { CPF } from 'src/shared/validator/cpf.validator';
import { UF } from 'src/shared/validator/uf.validator';
import { InscriptionCourseExist } from '../../InscriptionCourse/validator/inscription-course-exist.validator';
import { CreateLegalGuardianInput } from './create-legal-guardian.dto.input';

export class CreateStudentCourseInput {
  @ApiProperty()
  @UserExist({ message: 'User not found' })
  userId: string;

  @IsString()
  @ApiProperty()
  firstName: string;

  @IsString()
  @ApiProperty()
  lastName: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  socialName?: string | undefined;

  @IsNotEmpty()
  @ApiProperty()
  whatsapp: string;

  @IsDateString()
  @ApiProperty()
  birthday: Date;

  @IsString()
  @ApiProperty()
  email: string;

  @IsString()
  @ApiProperty()
  @IsOptional()
  rg?: string;

  @IsString()
  @ApiProperty()
  @UF({ message: 'Invalid UF' })
  @IsOptional()
  uf?: string;

  @IsString()
  @ApiProperty()
  @CPF({ message: 'Invalid CPF' })
  cpf: string;

  @IsString()
  @ApiProperty()
  @IsOptional()
  urgencyPhone?: string | undefined;

  @IsString()
  @ApiProperty()
  street: string;

  @IsNumber()
  @ApiProperty()
  number: number;

  @IsString()
  @ApiProperty()
  postalCode: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  complement?: string | undefined;

  @IsString()
  @ApiProperty()
  city: string;

  @IsString()
  @ApiProperty()
  state: string;

  @IsString()
  @ApiProperty()
  neighborhood: string;

  @ApiProperty()
  @IsString()
  @InscriptionCourseExist({ message: 'Partner Prep Course not found' })
  inscriptionId: string;

  @ApiProperty()
  @IsOptional()
  @ValidateIf((obj) => {
    const today = new Date();
    const birthDate = new Date(obj.birthday);
    const age = today.getFullYear() - birthDate.getFullYear();
    return age < 18;
  })
  @ValidateNested()
  @Type(() => CreateLegalGuardianInput)
  legalGuardian?: CreateLegalGuardianInput;

  @ApiProperty()
  @IsString()
  @IsOptional()
  socioeconomic?: string | undefined;
}
