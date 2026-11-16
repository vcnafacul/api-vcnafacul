import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEmailWhitelistDtoInput {
  @ApiProperty({ example: 'fulano@gmail.com' })
  @IsEmail({}, { message: 'Informe um email válido' })
  @MaxLength(255)
  email: string;

  @ApiProperty({
    required: false,
    description: 'de quem é o e-mail ou para que serve',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
