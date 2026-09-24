import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class CriarConviteDtoInput {
  @ApiProperty()
  @IsEmail({}, { message: 'Informe um email válido' })
  email: string;

  @ApiProperty({ description: 'a função do cursinho que a pessoa assumirá' })
  @IsString()
  roleId: string;
}
