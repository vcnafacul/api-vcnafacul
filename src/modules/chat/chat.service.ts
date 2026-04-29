import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepository } from 'src/modules/user/user.repository';
import { FirebaseService } from './firebase/firebase.service';

type UserLike = {
  id: string;
  name: string;
  socialName?: string | null;
  role: { name: string };
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly firebase: FirebaseService,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Gera um Firebase Custom Token para o usuário, com claims
   * `userId`, `role` e `name` (usa nome social quando disponível).
   */
  private async generateCustomToken(user: UserLike): Promise<string> {
    const claims = {
      userId: user.id,
      role: user.role.name,
      name: user.socialName ?? user.name,
    };
    return await this.firebase.auth().createCustomToken(user.id, claims);
  }

  /**
   * Carrega o usuário pelo id (incluindo role) e gera o custom token.
   * Usa `firstName + lastName` como nome completo e
   * `socialName + lastName` como nome social, espelhando o padrão de
   * exibição já usado no app (vide UserService.searchUsersByName).
   */
  async issueTokenForUserId(userId?: string): Promise<string> {
    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    // O payload do JWT (req.user via JwtStrategy) não traz role.name nem
    // o nome social formatado — busca direto no banco para garantir claims
    // corretos no custom token Firebase.
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const fullName = `${user.firstName} ${user.lastName}`;
    const socialName = user.socialName
      ? `${user.socialName} ${user.lastName}`
      : null;

    return this.generateCustomToken({
      id: user.id,
      name: fullName,
      socialName,
      role: { name: user.role?.name ?? '' },
    });
  }
}
