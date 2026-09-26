import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PropositoDoToken } from 'src/shared/auth/token-de-email';
import { CreateUserDtoInput } from '../dto/create.dto.input';
import { LoginTokenDTO } from '../dto/login-token.dto.input';
import { UserRepository } from '../user.repository';
import { UserService } from '../user.service';
import {
  ErroDoGoogle,
  PerfilGoogle,
  decidirEntrada,
  sanitizarVoltar,
} from './google-auth.regras';
import { CadastroPeloGoogleDtoInput } from './cadastro-pelo-google.dto.input';
import { CadastroPendente, VALIDADE_DO_CADASTRO_MS } from './cadastro-pendente';

const SEM_CADASTRO_PENDENTE =
  'O tempo para concluir o cadastro acabou. Entre com o Google de novo.';

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
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

  /**
   * Quem não tem conta (card 02): os dados do Google vão num token de 30 min
   * — **nenhuma linha em `users`** até o 2º passo (decisão de 2026-09-25:
   * quem fecha o navegador no meio não deixa conta sem aceite de LGPD).
   */
  async tokenDeCadastro(perfil: PerfilGoogle, voltar: string): Promise<string> {
    return this.jwtService.signAsync(
      { typ: PropositoDoToken.cadastroGoogle, perfil, voltar },
      { expiresIn: VALIDADE_DO_CADASTRO_MS / 1000 },
    );
  }

  /** O que o 2º passo mostra: email (travado) e nome do Google. */
  async cadastroPendente(token: string | undefined) {
    const { perfil } = await this.lerCadastro(token);
    return {
      email: perfil.email,
      firstName: perfil.firstName,
      lastName: perfil.lastName,
    };
  }

  /** O 2º passo: cria a conta — confirmada, sem senha, vinculada — e a sessão. */
  async cadastrar(
    token: string | undefined,
    dados: CadastroPeloGoogleDtoInput,
  ): Promise<{ sessao: LoginTokenDTO; voltar: string }> {
    const { perfil, voltar } = await this.lerCadastro(token);

    /*
      ⚠️ Entre o callback e o 2º passo cabem 30 min: a pessoa pode ter criado
      conta por email e senha, ou concluído o cadastro em outra aba.
    */
    if (
      (await this.userRepository.findOneBy({ email: perfil.email })) ||
      (await this.userRepository.findOneBy({ googleId: perfil.googleId }))
    ) {
      throw new HttpException(
        'Já existe uma conta com este email — entre com o Google de novo.',
        HttpStatus.CONFLICT,
      );
    }

    let usuario;
    try {
      usuario = await this.userService.createUser(
        { ...dados, email: perfil.email } as CreateUserDtoInput,
        { emailConfirmado: true, googleId: perfil.googleId },
      );
    } catch (erro) {
      // Mesma corrida, decidida pelo índice único
      if ((erro as { code?: string })?.code === 'ER_DUP_ENTRY') {
        throw new HttpException(
          'Já existe uma conta com este email — entre com o Google de novo.',
          HttpStatus.CONFLICT,
        );
      }
      throw erro;
    }
    await this.userRepository.updateLastAcess(usuario);
    return { sessao: await this.userService.emitirSessao(usuario), voltar };
  }

  private async lerCadastro(
    token: string | undefined,
  ): Promise<CadastroPendente> {
    if (!token) {
      throw new HttpException(SEM_CADASTRO_PENDENTE, HttpStatus.UNAUTHORIZED);
    }
    let payload: { typ?: string } & Partial<CadastroPendente>;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new HttpException(SEM_CADASTRO_PENDENTE, HttpStatus.UNAUTHORIZED);
    }
    // ⚠️ Um access token de login também é assinado com o APP_KEY
    if (payload.typ !== PropositoDoToken.cadastroGoogle || !payload.perfil) {
      throw new HttpException(SEM_CADASTRO_PENDENTE, HttpStatus.UNAUTHORIZED);
    }
    return {
      perfil: payload.perfil,
      voltar: sanitizarVoltar(payload.voltar),
    };
  }
}
