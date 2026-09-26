import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Equals } from 'class-validator';
import { CreateUserDtoInput } from '../dto/create.dto.input';

/**
 * O 2º passo do cadastro pelo Google (card 02 de `login-com-google`): o
 * cadastro normal sem email e sem senha.
 *
 * ⚠️ **O email não está aqui** — vem do token do Google. Se viesse do body, a
 * pessoa ganharia uma conta confirmada para um email que o Google não provou.
 */
export class CadastroPeloGoogleDtoInput extends OmitType(CreateUserDtoInput, [
  'email',
  'password',
  'password_confirmation',
  'about',
] as const) {
  /** Decisão de 2026-09-25: a conta só nasce com o aceite. */
  @Equals(true, {
    message: 'É preciso aceitar os termos de uso e a política de privacidade',
  })
  @ApiProperty()
  lgpd: boolean;
}
