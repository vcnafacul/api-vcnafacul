import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { UserExist } from 'src/modules/user/validator/user-exist.validator';
import { CPF } from 'src/shared/validator/cpf.validator';
import { RG } from 'src/shared/validator/rg.validator';
import { UF } from 'src/shared/validator/uf.validator';

export class CreateStudentCourseInput {
  @ApiProperty()
  @UserExist({ message: 'User not found' })
  userId: number;

  @IsString()
  @ApiProperty()
  @RG({ message: 'Invalid RG' })
  rg: string;

  @IsString()
  @ApiProperty()
  @UF({ message: 'Invalid UF' })
  uf: string;

  @IsString()
  @ApiProperty()
  @CPF({ message: 'Invalid CPF' })
  cpf: string;

  @IsString()
  @ApiProperty()
  @IsOptional()
  urgencyPhone?: string | undefined;
}
