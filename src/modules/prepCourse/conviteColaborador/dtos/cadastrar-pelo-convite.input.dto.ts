import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CreateUserDtoInput } from 'src/modules/user/dto/create.dto.input';

/**
 * O cadastro normal + o token do convite (card 05 de `convite-de-colaborador`).
 * Herda todas as validações do cadastro — nome, nascimento (14+), LGPD...
 */
export class CadastrarPeloConviteDtoInput extends CreateUserDtoInput {
  @ApiProperty({ description: 'o token do link do email' })
  @IsString()
  token: string;
}
