import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { UserRepository } from 'src/modules/user/user.repository';
import { ConversationMetadata, SenderType } from './chat.types';
import { FirebaseService } from './firebase/firebase.service';

const COOLDOWN_MS = 15 * 60 * 1000;
const MAX_CONTENT = 1000;
const TTL_DAYS = 7;

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
    // TODO: userName denormalizado fica stale se user muda nome social.
    // Aceitável MVP — Fase 2 pode considerar refresh ou query a cada listener tick.
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
      metadata: {
        page: metadata.page,
        userAgent: metadata.userAgent,
        device: metadata.device,
        browser: metadata.browser,
      },
    });
    this.logger.log(
      `chat.conversation_opened id=${created.id} user=${userId}`,
    );
    return { id: created.id };
  }

  /**
   * Suporte inicia uma conversa com um estudante (proativo). Se já existe
   * conversa aberta com o estudante, reusa. Caso contrário, cria + posta
   * a primeira mensagem em transação atômica.
   */
  async initiateConversation(
    supportAgentId: string,
    supportAgentName: string,
    targetUserId: string,
    content: string,
  ): Promise<{ conversationId: string; messageId: string }> {
    const target = await this.userRepository.findOneBy({ id: targetUserId });
    if (!target) {
      throw new NotFoundException('Estudante não encontrado');
    }
    const roleName = target.role?.name?.toLowerCase();
    if (roleName !== 'aluno' && roleName !== 'estudante') {
      throw new UnprocessableEntityException(
        'Apenas estudantes podem ser contatados',
      );
    }

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      throw new BadRequestException('Mensagem vazia');
    }
    if (trimmed.length > MAX_CONTENT) {
      throw new BadRequestException(
        `Mensagem maior que ${MAX_CONTENT} caracteres`,
      );
    }

    const displayName =
      target.useSocialName && target.socialName
        ? `${target.socialName} ${target.lastName}`
        : `${target.firstName} ${target.lastName}`;

    const db = this.firebase.firestore();
    const convs = db.collection('conversations');

    // Idempotency check is BEFORE the transaction (mirrors openConversation pattern).
    const openSnap = await convs
      .where('userId', '==', targetUserId)
      .where('status', '==', 'open')
      .limit(1)
      .get();

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    let convRef: admin.firestore.DocumentReference;
    let creatingNewConv = false;
    if (openSnap.empty) {
      creatingNewConv = true;
      convRef = convs.doc();
    } else {
      convRef = openSnap.docs[0].ref;
    }

    const messageRef = db.collection('messages').doc();

    await db.runTransaction(async (tx) => {
      if (creatingNewConv) {
        tx.set(convRef, {
          userId: targetUserId,
          userName: displayName,
          status: 'open',
          initiatedBy: 'support',
          createdAt: now,
          lastMessageAt: now,
          closedAt: null,
          closedBy: null,
          unreadCountStudent: 1,
          unreadCountSupport: 0,
          metadata: {
            page: 'support-initiated',
            userAgent: 'support-dashboard',
            device: 'desktop',
            browser: 'n/a',
          },
          lastMessageText: trimmed.slice(0, 100),
          lastMessageSenderType: 'support',
        });
      } else {
        tx.update(convRef, {
          lastMessageAt: now,
          lastMessageText: trimmed.slice(0, 100),
          lastMessageSenderType: 'support',
          unreadCountStudent: admin.firestore.FieldValue.increment(1),
        });
      }
      tx.set(messageRef, {
        conversationId: convRef.id,
        conversationUserId: targetUserId,
        senderId: supportAgentId,
        senderName: supportAgentName,
        senderType: 'support',
        content: trimmed,
        createdAt: now,
        expiresAt,
      });
    });

    this.logger.log(
      `chat.conversation_initiated_by_support id=${convRef.id} support=${supportAgentId} target=${targetUserId}`,
    );

    return { conversationId: convRef.id, messageId: messageRef.id };
  }

  /**
   * Persiste uma mensagem em `messages/{id}` com TTL 7d e atualiza
   * `conversations/{id}` (lastMessageAt + unreadCount do destinatário) em
   * transação Firestore atômica. Estudante só pode escrever na própria
   * conversa; suporte escreve em qualquer uma aberta.
   */
  async sendMessage(input: {
    senderId: string;
    senderName: string;
    senderType: SenderType;
    conversationId: string;
    content: string;
  }): Promise<{ id: string }> {
    const content = input.content.trim();
    if (content.length === 0) {
      throw new BadRequestException('Mensagem vazia');
    }
    if (content.length > MAX_CONTENT) {
      throw new BadRequestException(
        `Mensagem maior que ${MAX_CONTENT} caracteres`,
      );
    }

    const db = this.firebase.firestore();
    const convRef = db.collection('conversations').doc(input.conversationId);
    const convSnap = await convRef.get();
    if (!convSnap.exists) {
      throw new NotFoundException('Conversa não encontrada');
    }

    const conv = convSnap.data()!;
    if (conv.status !== 'open') {
      throw new BadRequestException('Conversa fechada');
    }

    if (input.senderType === 'student' && conv.userId !== input.senderId) {
      throw new ForbiddenException('Sem permissão nesta conversa');
    }

    const messageRef = db.collection('messages').doc();
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    const unreadField =
      input.senderType === 'student'
        ? 'unreadCountSupport'
        : 'unreadCountStudent';

    await db.runTransaction(async (tx) => {
      tx.set(messageRef, {
        conversationId: input.conversationId,
        // Denormalizado da conversation: permite security rules sem get() extra
        // (ver spec seção 4.5).
        conversationUserId: conv.userId,
        senderId: input.senderId,
        senderName: input.senderName,
        senderType: input.senderType,
        content,
        createdAt: now,
        expiresAt,
      });
      tx.update(convRef, {
        lastMessageAt: now,
        lastMessageText: content.slice(0, 100),
        lastMessageSenderType: input.senderType,
        [unreadField]: admin.firestore.FieldValue.increment(1),
      });
    });

    this.logger.log(
      `chat.message_sent conv=${input.conversationId} sender=${input.senderType}/${input.senderId}`,
    );

    return { id: messageRef.id };
  }

  /**
   * Encerra a conversa, registra `closedBy`/`closedAt` (inicia o cooldown de
   * 15min para o estudante). Tanto estudante quanto suporte podem fechar;
   * estudante só pode fechar a própria conversa.
   */
  async closeConversation(
    conversationId: string,
    actorId: string,
    actorType: SenderType,
  ): Promise<void> {
    const ref = this.firebase
      .firestore()
      .collection('conversations')
      .doc(conversationId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new NotFoundException('Conversa não encontrada');
    }

    const data = snap.data()!;
    if (actorType === 'student' && data.userId !== actorId) {
      throw new ForbiddenException('Sem permissão nesta conversa');
    }

    await ref.update({
      status: 'closed',
      closedAt: admin.firestore.Timestamp.now(),
      closedBy: actorType,
    });
    this.logger.log(
      `chat.conversation_closed id=${conversationId} by=${actorType}`,
    );
  }

  /**
   * Zera o contador de não-lidas do lado que chamou (estudante vê
   * `unreadCountStudent`, suporte vê `unreadCountSupport`). Estudante só
   * pode marcar a própria conversa como lida.
   *
   * Funciona mesmo em conversas closed (estudante volta pra ver histórico
   * → counter zera independente do status — comportamento intencional).
   */
  async markRead(
    conversationId: string,
    actorId: string,
    actorType: SenderType,
  ): Promise<void> {
    const ref = this.firebase
      .firestore()
      .collection('conversations')
      .doc(conversationId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new NotFoundException('Conversa não encontrada');
    }
    if (actorType === 'student' && snap.data()!.userId !== actorId) {
      throw new ForbiddenException('Sem permissão nesta conversa');
    }

    const field =
      actorType === 'student' ? 'unreadCountStudent' : 'unreadCountSupport';
    await ref.update({ [field]: 0 });
  }

  /**
   * Resolve o tipo de ator (`student` | `support`) a partir do `userId`.
   * Necessário porque o `req.user` vindo do JwtStrategy não inclui
   * `role.supportAgent` — então cada endpoint que precisa diferenciar
   * delega aqui (1 query extra por chamada; OK pra MVP, otimizar com
   * Redis se necessário).
   */
  async resolveActorType(userId: string): Promise<SenderType> {
    const { actorType } = await this.resolveActor(userId);
    return actorType;
  }

  /**
   * Resolve actorType + displayName num único load. Usado pelos endpoints
   * que precisam dos dois (open/send) — evita 2 queries.
   */
  async resolveActor(
    userId: string,
  ): Promise<{ actorType: SenderType; displayName: string }> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user || !user.role) {
      throw new UnauthorizedException('Usuário não autenticado');
    }
    const actorType: SenderType = user.role.supportAgent ? 'support' : 'student';
    const displayName =
      user.useSocialName && user.socialName
        ? `${user.socialName} ${user.lastName}`
        : `${user.firstName} ${user.lastName}`;
    return { actorType, displayName };
  }
}
