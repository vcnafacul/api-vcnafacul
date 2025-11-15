import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEnrollmentStatusDtoInput {
  @ApiProperty({
    description: 'CPF do estudante (apenas números)',
    example: '12345678900',
  })
  @IsNotEmpty()
  @IsString()
  cpf: string;

  @ApiProperty({
    description: 'Código de matrícula do estudante',
    example: '20250001',
  })
  @IsNotEmpty()
  @IsString()
  enrollmentCode: string;
}
