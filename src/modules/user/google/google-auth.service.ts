import { Injectable } from '@nestjs/common';
import { LoginTokenDTO } from '../dto/login-token.dto.input';
import { UserRepository } from '../user.repository';
import { UserService } from '../user.service';
import {
  ErroDoGoogle,
  PerfilGoogle,
  decidirEntrada,
} from './google-auth.regras';

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
  ) {}

  /**
   * Entrar com Google (card 01 de `login-com-google`) — só quem já tem conta.
   * Quem não tem volta `sem-conta`; o cadastro é o card 02.
   */
  async entrar(
    perfil: PerfilGoogle,
  ): Promise<{ sessao: LoginTokenDTO } | { erro: ErroDoGoogle }> {
    const porGoogleId = await this.userRepository.findOneBy({
      googleId: perfil.googleId,
    });
    const porEmail = porGoogleId
      ? null
      : await this.userRepository.findOneBy({ email: perfil.email });

    const entrada = decidirEntrada(porGoogleId, porEmail, perfil);
    if (entrada.acao === 'recusar') return { erro: entrada.erro };
    if (entrada.acao === 'sem-conta') return { erro: 'sem-conta' };

    const { usuario } = entrada;
    if (entrada.vincular) usuario.googleId = perfil.googleId;
    if (entrada.confirmarEmail) usuario.emailConfirmSended = null;
    // ⚠️ Um `save` só: grava o vínculo, a confirmação e o último acesso
    await this.userRepository.updateLastAcess(usuario);

    return { sessao: await this.userService.emitirSessao(usuario) };
  }
}
