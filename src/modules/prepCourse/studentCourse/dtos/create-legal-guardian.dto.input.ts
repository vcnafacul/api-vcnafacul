import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CPF } from 'src/shared/validator/cpf.validator';
import { UF } from 'src/shared/validator/uf.validator';

export class CreateLegalGuardianInput {
  @IsString()
  @ApiProperty()
  fullName: string;

  @IsString()
  @ApiProperty()
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
  phone?: string;
}
