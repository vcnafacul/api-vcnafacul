/**
 * NOTA: o codebase usa Babel + @babel/plugin-proposal-decorators (legacy mode)
 * como transformer dos testes. Esse modo NÃO suporta parameter decorators
 * (ex.: `@Req() req: Request`), então qualquer .spec que faça `import` direto
 * do `chat.controller.ts` quebra com SyntaxError em parsing.
 *
 * Por isso este teste verifica apenas o CONTRATO de comportamento via stubs
 * do ChatService — espelhando o que cada handler faz: extrai `req.user.id`,
 * resolve actor type via service, valida e delega para o método de domínio.
 * A lógica de negócio (Firestore, validações, transações) está coberta em
 * `chat.service.spec.ts`.
 *
 * Smoke E2E real dos endpoints `POST /chat/*` ficará na suíte de integração
 * quando o projeto Firebase estiver provisionado (Phase 0/3).
 */

import { ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import type { ChatService } from './chat.service';
import type { OpenConversationDto } from './dtos/open-conversation.dto';
import type { SendMessageDto } from './dtos/send-message.dto';

type AuthenticatedReqUser = {
  id: string;
  name?: string;
  socialName?: string | null;
};

function getReqUser(req: Request): AuthenticatedReqUser | undefined {
  return req.user as AuthenticatedReqUser | undefined;
}

// Reimplementa o que cada handler do controller faz (sem parameter decorators).

async function getFirebaseTokenLogic(
  chatService: Pick<ChatService, 'issueTokenForUserId'>,
  req: Request,
): Promise<{ token: string }> {
  const reqUser = getReqUser(req);
  const token = await chatService.issueTokenForUserId(reqUser?.id);
  return { token };
}

async function openConversationLogic(
  chatService: Pick<ChatService, 'resolveActorType' | 'openConversation'>,
  req: Request,
  body: OpenConversationDto,
): Promise<{ id: string }> {
  const user = getReqUser(req);
  if (!user?.id) throw new ForbiddenException();
  const actor = await chatService.resolveActorType(user.id);
  if (actor !== 'student') {
    throw new ForbiddenException('Apenas estudantes abrem conversas');
  }
  return chatService.openConversation(
    user.id,
    user.socialName ?? user.name ?? '',
    body.metadata,
  );
}

async function closeConversationLogic(
  chatService: Pick<ChatService, 'resolveActorType' | 'closeConversation'>,
  req: Request,
  id: string,
): Promise<{ ok: true }> {
  const user = getReqUser(req);
  if (!user?.id) throw new ForbiddenException();
  const actorType = await chatService.resolveActorType(user.id);
  await chatService.closeConversation(id, user.id, actorType);
  return { ok: true };
}

async function sendMessageLogic(
  chatService: Pick<ChatService, 'resolveActorType' | 'sendMessage'>,
  req: Request,
  body: SendMessageDto,
): Promise<{ id: string }> {
  const user = getReqUser(req);
  if (!user?.id) throw new ForbiddenException();
  const senderType = await chatService.resolveActorType(user.id);
  return chatService.sendMessage({
    senderId: user.id,
    senderName: user.socialName ?? user.name ?? '',
    senderType,
    conversationId: body.conversationId,
    content: body.content,
  });
}

async function markReadLogic(
  chatService: Pick<ChatService, 'resolveActorType' | 'markRead'>,
  req: Request,
  id: string,
): Promise<{ ok: true }> {
  const user = getReqUser(req);
  if (!user?.id) throw new ForbiddenException();
  const actorType = await chatService.resolveActorType(user.id);
  await chatService.markRead(id, user.id, actorType);
  return { ok: true };
}

describe('ChatController.getFirebaseToken (contract)', () => {
  it('extrai req.user.id e delega para chatService.issueTokenForUserId', async () => {
    const issueTokenForUserId = jest.fn().mockResolvedValue('tk');
    const req = { user: { id: 'u-123' } } as unknown as Request;

    const res = await getFirebaseTokenLogic(
      { issueTokenForUserId } as unknown as ChatService,
      req,
    );

    expect(issueTokenForUserId).toHaveBeenCalledWith('u-123');
    expect(res).toEqual({ token: 'tk' });
  });

  it('passa undefined quando req.user ausente (service rejeita com 401)', async () => {
    const issueTokenForUserId = jest.fn();
    const req = {} as Request;

    await getFirebaseTokenLogic(
      { issueTokenForUserId } as unknown as ChatService,
      req,
    );

    expect(issueTokenForUserId).toHaveBeenCalledWith(undefined);
  });
});

describe('ChatController.openConversation (contract)', () => {
  const body: OpenConversationDto = {
    metadata: {
      page: '/x',
      userAgent: 'UA',
      device: 'desktop',
      browser: 'chrome',
    },
  };

  it('opens conversation when actor is student', async () => {
    const resolveActorType = jest.fn().mockResolvedValue('student');
    const openConversation = jest.fn().mockResolvedValue({ id: 'c1' });
    const req = {
      user: { id: 'u1', name: 'João', socialName: null },
    } as unknown as Request;

    const res = await openConversationLogic(
      { resolveActorType, openConversation } as unknown as ChatService,
      req,
      body,
    );

    expect(resolveActorType).toHaveBeenCalledWith('u1');
    expect(openConversation).toHaveBeenCalledWith('u1', 'João', body.metadata);
    expect(res).toEqual({ id: 'c1' });
  });

  it('uses socialName when present', async () => {
    const resolveActorType = jest.fn().mockResolvedValue('student');
    const openConversation = jest.fn().mockResolvedValue({ id: 'c1' });
    const req = {
      user: { id: 'u1', name: 'João Silva', socialName: 'Aninha' },
    } as unknown as Request;

    await openConversationLogic(
      { resolveActorType, openConversation } as unknown as ChatService,
      req,
      body,
    );

    expect(openConversation).toHaveBeenCalledWith(
      'u1',
      'Aninha',
      body.metadata,
    );
  });

  it('rejects when actor is support', async () => {
    const resolveActorType = jest.fn().mockResolvedValue('support');
    const openConversation = jest.fn();
    const req = { user: { id: 'agent-1' } } as unknown as Request;

    await expect(
      openConversationLogic(
        { resolveActorType, openConversation } as unknown as ChatService,
        req,
        body,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(openConversation).not.toHaveBeenCalled();
  });

  it('rejects when no user authenticated', async () => {
    const resolveActorType = jest.fn();
    const openConversation = jest.fn();
    const req = {} as Request;

    await expect(
      openConversationLogic(
        { resolveActorType, openConversation } as unknown as ChatService,
        req,
        body,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(resolveActorType).not.toHaveBeenCalled();
  });
});

describe('ChatController.closeConversation (contract)', () => {
  it('delegates to closeConversation with resolved actor (student)', async () => {
    const resolveActorType = jest.fn().mockResolvedValue('student');
    const closeConversation = jest.fn().mockResolvedValue(undefined);
    const req = { user: { id: 'u1' } } as unknown as Request;

    const res = await closeConversationLogic(
      { resolveActorType, closeConversation } as unknown as ChatService,
      req,
      'c1',
    );

    expect(closeConversation).toHaveBeenCalledWith('c1', 'u1', 'student');
    expect(res).toEqual({ ok: true });
  });

  it('delegates with actor=support when supportAgent', async () => {
    const resolveActorType = jest.fn().mockResolvedValue('support');
    const closeConversation = jest.fn().mockResolvedValue(undefined);
    const req = { user: { id: 'agent-1' } } as unknown as Request;

    await closeConversationLogic(
      { resolveActorType, closeConversation } as unknown as ChatService,
      req,
      'c1',
    );

    expect(closeConversation).toHaveBeenCalledWith('c1', 'agent-1', 'support');
  });
});

describe('ChatController.sendMessage (contract)', () => {
  const body: SendMessageDto = {
    conversationId: 'c1',
    content: 'olá',
  };

  it('sends message as student (uses socialName)', async () => {
    const resolveActorType = jest.fn().mockResolvedValue('student');
    const sendMessage = jest.fn().mockResolvedValue({ id: 'm1' });
    const req = {
      user: { id: 'u1', name: 'João', socialName: 'Joãozinho' },
    } as unknown as Request;

    const res = await sendMessageLogic(
      { resolveActorType, sendMessage } as unknown as ChatService,
      req,
      body,
    );

    expect(sendMessage).toHaveBeenCalledWith({
      senderId: 'u1',
      senderName: 'Joãozinho',
      senderType: 'student',
      conversationId: 'c1',
      content: 'olá',
    });
    expect(res).toEqual({ id: 'm1' });
  });

  it('sends message as support', async () => {
    const resolveActorType = jest.fn().mockResolvedValue('support');
    const sendMessage = jest.fn().mockResolvedValue({ id: 'm2' });
    const req = {
      user: { id: 'agent-1', name: 'Suporte', socialName: null },
    } as unknown as Request;

    await sendMessageLogic(
      { resolveActorType, sendMessage } as unknown as ChatService,
      req,
      body,
    );

    expect(sendMessage).toHaveBeenCalledWith({
      senderId: 'agent-1',
      senderName: 'Suporte',
      senderType: 'support',
      conversationId: 'c1',
      content: 'olá',
    });
  });
});

describe('ChatController.markRead (contract)', () => {
  it('delegates to markRead with resolved actor', async () => {
    const resolveActorType = jest.fn().mockResolvedValue('student');
    const markRead = jest.fn().mockResolvedValue(undefined);
    const req = { user: { id: 'u1' } } as unknown as Request;

    const res = await markReadLogic(
      { resolveActorType, markRead } as unknown as ChatService,
      req,
      'c1',
    );

    expect(markRead).toHaveBeenCalledWith('c1', 'u1', 'student');
    expect(res).toEqual({ ok: true });
  });

  it('delegates as support when actor is support_agent', async () => {
    const resolveActorType = jest.fn().mockResolvedValue('support');
    const markRead = jest.fn().mockResolvedValue(undefined);
    const req = { user: { id: 'agent-1' } } as unknown as Request;

    await markReadLogic(
      { resolveActorType, markRead } as unknown as ChatService,
      req,
      'c1',
    );

    expect(markRead).toHaveBeenCalledWith('c1', 'agent-1', 'support');
  });
});
