import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { UserRepository } from 'src/modules/user/user.repository';
import { ConversationMetadata } from './chat.types';
import { FirebaseService } from './firebase/firebase.service';

const COOLDOWN_MS = 15 * 60 * 1000;

type UserLike = {
  id: string;
  name: string;
  socialName?: string | null;
  role: { supportAgent: boolean };
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
      role: user.role.supportAgent ? 'support_agent' : 'student',
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
      role: { supportAgent: user.role?.supportAgent === true },
    });
  }

  /**
   * Abre uma nova conversa de suporte para o estudante OU retorna a aberta
   * existente. Se a última conversa do usuário foi fechada há menos de 15min,
   * lança 429 com `retryAfterSeconds` (cooldown anti-abuso).
   */
  async openConversation(
    userId: string,
    userName: string,
    metadata: ConversationMetadata,
  ): Promise<{ id: string }> {
    const db = this.firebase.firestore();
    const convs = db.collection('conversations');

    // 1. Já existe conversa aberta? Retorna sem duplicar.
    const openSnap = await convs
      .where('userId', '==', userId)
      .where('status', '==', 'open')
      .limit(1)
      .get();
    if (!openSnap.empty) {
      return { id: openSnap.docs[0].id };
    }

    // 2. Cooldown: 15min após última conversa fechada.
    const lastClosedSnap = await convs
      .where('userId', '==', userId)
      .where('status', '==', 'closed')
      .orderBy('closedAt', 'desc')
      .limit(1)
      .get();
    if (!lastClosedSnap.empty) {
      const closedAt = lastClosedSnap.docs[0].data().closedAt?.toDate();
      if (closedAt) {
        const remaining = COOLDOWN_MS - (Date.now() - closedAt.getTime());
        if (remaining > 0) {
          throw new HttpException(
            {
              message: 'Aguarde antes de iniciar nova conversa (cooldown)',
              retryAfterSeconds: Math.ceil(remaining / 1000),
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
    }

    // 3. Cria nova conversa.
    const now = admin.firestore.Timestamp.now();
    const created = await convs.add({
      userId,
      userName,
      status: 'open',
      createdAt: now,
      lastMessageAt: now,
      closedAt: null,
      closedBy: null,
      unreadCountStudent: 0,
      unreadCountSupport: 0,
      metadata,
    });
    this.logger.log(
      `chat.conversation_opened id=${created.id} user=${userId}`,
    );
    return { id: created.id };
  }
}
