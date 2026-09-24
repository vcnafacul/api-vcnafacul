import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AtribuirFuncaoDtoInput {
  @ApiProperty({ description: 'o usuário colaborador' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'a função do cursinho' })
  @IsString()
  roleId: string;
}
