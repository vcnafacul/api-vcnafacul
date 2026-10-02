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
import { InscriptionCourseRepository } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.repository';
import { CollaboratorRepository } from 'src/modules/prepCourse/collaborator/collaborator.repository';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { UserRepository } from 'src/modules/user/user.repository';
import { ConversationMetadata, SenderType } from './chat.types';
import { OpenConversationDto } from './dtos/open-conversation.dto';
import { FirebaseService } from 'src/shared/modules/firebase/firebase.service';
import { PushService } from 'src/modules/push/push.service';

const COOLDOWN_MS = 15 * 60 * 1000;
const MAX_CONTENT = 1000;
const TTL_DAYS = 7;
/**
 * Push da mensagem do suporte (tickets/031, card 07): no máximo um por
 * conversa a cada 10 min enquanto o estudante não ler. Ler libera o próximo.
 */
export const INTERVALO_PUSH_DO_CHAT_MS = 10 * 60 * 1000;
const TRECHO_DO_PUSH = 120;

/** Deve avisar o estudante desta mensagem do suporte? (puro, para teste) */
export function deveAvisarEstudante(
  conv: {
    unreadCountStudent?: number;
    ultimoPushEstudanteEm?: { toMillis: () => number } | null;
  },
  agora: number,
): boolean {
  // Sem não lidas antes desta = ele leu tudo: a primeira de novo avisa.
  if (!conv.unreadCountStudent) return true;
  const ultimo = conv.ultimoPushEstudanteEm?.toMillis?.();
  return !ultimo || agora - ultimo >= INTERVALO_PUSH_DO_CHAT_MS;
}

type UserLike = {
  id: string;
  name: string;
  socialName?: string | null;
  role: { supportAgent: boolean; partnerPrepSupportAgent?: boolean };
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly firebase: FirebaseService,
    private readonly userRepository: UserRepository,
    private readonly collaboratorRepository: CollaboratorRepository,
    private readonly inscriptionCourseRepository: InscriptionCourseRepository,
    private readonly studentCourseRepository: StudentCourseRepository,
    private readonly push: PushService,
  ) {}

  /**
   * Onde o suporte pode agir (tickets/031, card 01): o suporte do projeto
   * (`supportAgent`) em todas as conversas; o colaborador do cursinho
   * (`partnerPrepSupportAgent`) só nas do próprio cursinho.
   *
   * ⚠️ Antes disso, `message`/`close`/`read` aceitavam qualquer conversa para
   * quem resolvia como "suporte" — bastava o id. As regras do Firestore só
   * protegem a LEITURA; as escritas passam pela api (Admin SDK).
   */
  private async escopoDoSuporte(
    userId: string,
  ): Promise<{ global: boolean; partnerPrepId: string | null }> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (user?.role?.supportAgent) return { global: true, partnerPrepId: null };
    const collaborator =
      await this.collaboratorRepository.findOneByUserId(userId);
    return {
      global: false,
      partnerPrepId: collaborator?.partnerPrepCourse?.id ?? null,
    };
  }

  /** 403 se o suporte não pode agir nesta conversa (colaborador sem cursinho, ou de outro). */
  private async garantirAcessoDoSuporte(
    conv: { partnerPrepId?: string | null },
    supportId: string,
  ): Promise<void> {
    const escopo = await this.escopoDoSuporte(supportId);
    if (escopo.global) return;
    if (
      !escopo.partnerPrepId ||
      (conv.partnerPrepId ?? null) !== escopo.partnerPrepId
    ) {
      throw new ForbiddenException('Sem permissão nesta conversa');
    }
  }

  /**
   * Resolve o role e partnerPrepId para as claims do Firebase custom token.
   * Regra de segurança: partnerPrepSupportAgent=true SEM Collaborator válido
   * → role='student', partnerPrepId=null (evita acesso global por má configuração).
   */
  private async resolveTokenClaims(
    user: UserLike,
  ): Promise<{ role: string; partnerPrepId: string | null }> {
    if (user.role.supportAgent) {
      return { role: 'support_agent', partnerPrepId: null };
    }
    if (user.role.partnerPrepSupportAgent) {
      const collaborator = await this.collaboratorRepository.findOneByUserId(
        user.id,
      );
      const partnerPrepId = collaborator?.partnerPrepCourse?.id ?? null;
      if (partnerPrepId) {
        return { role: 'support_agent', partnerPrepId };
      }
    }
    return { role: 'student', partnerPrepId: null };
  }

  /**
   * Resolve o contexto da conversa a partir do identificador da inscrição.
   * Retorna o partnerPrepId, o nome do cursinho e o rótulo de origem para
   * exibição no header e lista de conversas do suporte.
   */
  private async resolveConversationContext(
    dto: Pick<
      OpenConversationDto,
      | 'inscriptionCourseId'
      | 'declaredInterestInscriptionCourseId'
      | 'studentCourseId'
    >,
  ): Promise<{
    partnerPrepId: string | null;
    cursinhoName: string | null;
    originLabel: string | null;
  }> {
    if (dto.inscriptionCourseId) {
      const inscription =
        await this.inscriptionCourseRepository.findOneWithPartnerPrep(
          dto.inscriptionCourseId,
        );
      return {
        partnerPrepId: inscription?.partnerPrepCourse?.id ?? null,
        cursinhoName: inscription?.partnerPrepCourse?.geo?.name ?? null,
        originLabel: 'Formulário de inscrição',
      };
    }
    if (dto.declaredInterestInscriptionCourseId) {
      const inscription =
        await this.inscriptionCourseRepository.findOneWithPartnerPrep(
          dto.declaredInterestInscriptionCourseId,
        );
      return {
        partnerPrepId: inscription?.partnerPrepCourse?.id ?? null,
        cursinhoName: inscription?.partnerPrepCourse?.geo?.name ?? null,
        originLabel: 'Declaração de interesse',
      };
    }
    // Clientes antigos enviavam o id da declaração de interesse como
    // studentCourseId; mantido para não quebrar abas com versão em cache.
    if (dto.studentCourseId) {
      const studentCourse =
        await this.studentCourseRepository.findOneWithPartnerPrep(
          dto.studentCourseId,
        );
      return {
        partnerPrepId: studentCourse?.partnerPrepCourse?.id ?? null,
        cursinhoName: studentCourse?.partnerPrepCourse?.geo?.name ?? null,
        originLabel: 'Declaração de interesse',
      };
    }
    return { partnerPrepId: null, cursinhoName: null, originLabel: null };
  }

  /**
   * Gera um Firebase Custom Token para o usuário, com claims
   * `userId`, `role`, `partnerPrepId` e `name` (usa nome social quando disponível).
   */
  private async generateCustomToken(user: UserLike): Promise<string> {
    const { role, partnerPrepId } = await this.resolveTokenClaims(user);
    const claims = {
      userId: user.id,
      role,
      partnerPrepId,
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
      role: {
        supportAgent: user.role?.supportAgent === true,
        partnerPrepSupportAgent: user.role?.partnerPrepSupportAgent === true,
      },
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
    context?: Pick<
      OpenConversationDto,
      | 'inscriptionCourseId'
      | 'declaredInterestInscriptionCourseId'
      | 'studentCourseId'
    >,
  ): Promise<{ id: string }> {
    const db = this.firebase.firestore();
    const convs = db.collection('conversations');

    // O destino (cursinho da página, ou o projeto) vem antes de tudo: a
    // conversa aberta e o cooldown são POR DESTINO (tickets/031, card 02).
    const { partnerPrepId, cursinhoName, originLabel } = context
      ? await this.resolveConversationContext(context)
      : { partnerPrepId: null, cursinhoName: null, originLabel: null };

    // 1. Já existe conversa aberta com ESTE destino? Retorna sem duplicar.
    // ⚠️ Antes procurava qualquer conversa aberta do estudante: a pergunta para
    // o cursinho A caía na conversa do cursinho B ou do projeto.
    const openSnap = await convs
      .where('userId', '==', userId)
      .where('status', '==', 'open')
      .where('partnerPrepId', '==', partnerPrepId)
      .limit(1)
      .get();
    if (!openSnap.empty) {
      return { id: openSnap.docs[0].id };
    }

    // 2. Cooldown: 15min após última conversa fechada no mesmo escopo (userId +
    // partnerPrepId). Cursinhos distintos não bloqueiam entre si.
    let cooldownQuery = convs
      .where('userId', '==', userId)
      .where('status', '==', 'closed')
      .where('partnerPrepId', '==', partnerPrepId)
      .orderBy('closedAt', 'desc')
      .limit(1);

    const lastClosedSnap = await cooldownQuery.get();
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
      partnerPrepId,
      cursinhoName,
      originLabel,
      metadata: {
        page: metadata.page,
        userAgent: metadata.userAgent,
        device: metadata.device,
        browser: metadata.browser,
      },
    });
    this.logger.log(`chat.conversation_opened id=${created.id} user=${userId}`);
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
    // Só o suporte do projeto inicia conversa (tickets/031, R2). O colaborador
    // escrevia na conversa aberta de qualquer estudante, ou criava uma sem
    // cursinho que caía na inbox do projeto.
    if (!(await this.escopoDoSuporte(supportAgentId)).global) {
      throw new ForbiddenException(
        'Apenas o suporte do projeto pode iniciar conversa',
      );
    }

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
    // Só a conversa do PROJETO (quem inicia é o suporte do projeto): a de um
    // cursinho com o mesmo estudante não pode receber a mensagem do projeto.
    const openSnap = await convs
      .where('userId', '==', targetUserId)
      .where('status', '==', 'open')
      .where('partnerPrepId', '==', null)
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
          // ⚠️ Explícito: no Firestore, `where('partnerPrepId', '==', null)`
          // NÃO encontra documento sem o campo — a conversa sumiria da busca.
          partnerPrepId: null,
          cursinhoName: null,
          originLabel: null,
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
    // Permissão antes do status: quem não pode agir não descobre nada dela.
    if (input.senderType === 'student' && conv.userId !== input.senderId) {
      throw new ForbiddenException('Sem permissão nesta conversa');
    }
    if (input.senderType === 'support') {
      await this.garantirAcessoDoSuporte(conv, input.senderId);
    }

    if (conv.status !== 'open') {
      throw new BadRequestException('Conversa fechada');
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
    const avisar =
      input.senderType === 'support' &&
      deveAvisarEstudante(conv, now.toMillis());

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
        // Junto com a mensagem: o ritmo do push não depende do envio dar certo.
        ...(avisar ? { ultimoPushEstudanteEm: now } : {}),
      });
    });

    if (avisar) {
      // ⚠️ Nunca derruba o envio da mensagem: push desligado no ambiente,
      // estudante sem aparelho ou FCM fora — só log.
      this.avisarEstudante(input.conversationId, conv, content).catch((e) =>
        this.logger.warn(
          `chat.push_falhou conv=${input.conversationId}: ${(e as Error).message}`,
        ),
      );
    }

    this.logger.log(
      `chat.message_sent conv=${input.conversationId} sender=${input.senderType}/${input.senderId}`,
    );

    return { id: messageRef.id };
  }

  /**
   * Push para o estudante com o app fechado (tickets/031, card 07). O toque
   * abre o balão na conversa (`?conversa=`, client card 05); a mesma `tag`
   * substitui o aviso anterior da conversa em vez de empilhar.
   *
   * Via `sendToUsers`, que NÃO grava na central do MySQL — o sino já mostra a
   * conversa pelo Firestore; gravar faria aparecer duas vezes.
   */
  private async avisarEstudante(
    conversationId: string,
    // userId, partnerPrepId, cursinhoName do documento da conversa.
    conv: admin.firestore.DocumentData,
    content: string,
  ): Promise<void> {
    const titulo = conv.partnerPrepId
      ? conv.cursinhoName || 'Cursinho'
      : 'Suporte Você na Facul';
    const corpo =
      content.length > TRECHO_DO_PUSH
        ? `${content.slice(0, TRECHO_DO_PUSH - 1).trimEnd()}…`
        : content;
    await this.push.sendToUsers([conv.userId], {
      title: titulo,
      body: corpo,
      url: `/dashboard?conversa=${encodeURIComponent(conversationId)}`,
      tag: `chat-${conversationId}`,
    });
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
    if (actorType === 'support') {
      await this.garantirAcessoDoSuporte(data, actorId);
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
    if (actorType === 'support') {
      await this.garantirAcessoDoSuporte(snap.data()!, actorId);
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

  async resolveActorForMessage(
    userId: string,
  ): Promise<{ actorType: SenderType; senderName: string }> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user || !user.role) {
      throw new UnauthorizedException('Usuário não autenticado');
    }
    const actorType: SenderType =
      user.role.supportAgent || user.role.partnerPrepSupportAgent
        ? 'support'
        : 'student';
    const baseName =
      user.useSocialName && user.socialName
        ? `${user.socialName} ${user.lastName}`
        : `${user.firstName} ${user.lastName}`;
    const senderName = await this.buildSenderName(
      userId,
      baseName,
      actorType,
      user.role,
    );
    return { actorType, senderName };
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
    const actorType: SenderType =
      user.role.supportAgent || user.role.partnerPrepSupportAgent
        ? 'support'
        : 'student';
    const displayName =
      user.useSocialName && user.socialName
        ? `${user.socialName} ${user.lastName}`
        : `${user.firstName} ${user.lastName}`;
    return { actorType, displayName };
  }

  /**
   * Retorna o nome do remetente com contexto entre parênteses para mensagens
   * de suporte: "Nome (Suporte Você na Facul)" ou "Nome (Nome do Cursinho)".
   * Estudantes recebem apenas o nome sem contexto.
   */
  private async buildSenderName(
    userId: string,
    baseName: string,
    actorType: SenderType,
    role: { supportAgent: boolean; partnerPrepSupportAgent?: boolean },
  ): Promise<string> {
    if (actorType !== 'support') return baseName;
    if (role.supportAgent) return `${baseName} (Suporte Você na Facul)`;
    const collaborator =
      await this.collaboratorRepository.findOneByUserIdWithGeo(userId);
    const cursinhoName = collaborator?.partnerPrepCourse?.geo?.name;
    return cursinhoName ? `${baseName} (${cursinhoName})` : baseName;
  }

  /**
   * Retorna o partnerPrepCourse.id do Collaborator vinculado ao usuário,
   * independente de ele também ser supportAgent global.
   * Usado pela tela /dashboard/suporte-cursinho para sempre escopar ao
   * cursinho correto — sem depender das claims do token Firebase.
   */
  async getCallerPartnerPrepId(
    userId: string,
  ): Promise<{ partnerPrepId: string | null }> {
    const collaborator =
      await this.collaboratorRepository.findOneByUserId(userId);
    return { partnerPrepId: collaborator?.partnerPrepCourse?.id ?? null };
  }
}
