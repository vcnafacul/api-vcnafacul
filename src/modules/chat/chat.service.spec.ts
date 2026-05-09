import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CollaboratorRepository } from 'src/modules/prepCourse/collaborator/collaborator.repository';
import { UserRepository } from 'src/modules/user/user.repository';
import { ChatService } from './chat.service';
import { FirebaseService } from './firebase/firebase.service';

describe('ChatService', () => {
  let service: ChatService;
  const mockAuth = { createCustomToken: jest.fn() };
  const mockFirebase: {
    auth: () => typeof mockAuth;
    firestore: () => unknown;
  } = {
    auth: () => mockAuth,
    firestore: () => ({}),
  };
  const mockUserRepo = { findOneBy: jest.fn() };
  const mockCollaboratorRepository = { findOneByUserId: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChatService(
      mockFirebase as unknown as FirebaseService,
      mockUserRepo as unknown as UserRepository,
      mockCollaboratorRepository as unknown as CollaboratorRepository,
    );
  });

  describe('issueTokenForUserId', () => {
    it('busca user no banco e gera token com claims formatados (com socialName)', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: 'u1',
        firstName: 'Ana',
        lastName: 'Souza',
        socialName: 'Aninha',
        role: { name: 'aluno', supportAgent: false },
      });
      mockAuth.createCustomToken.mockResolvedValue('tk');

      const token = await service.issueTokenForUserId('u1');

      expect(token).toBe('tk');
      expect(mockUserRepo.findOneBy).toHaveBeenCalledWith({ id: 'u1' });
      expect(mockAuth.createCustomToken).toHaveBeenCalledWith('u1', {
        userId: 'u1',
        role: 'student',
        partnerPrepId: null,
        name: 'Aninha Souza',
      });
    });

    it('usa firstName + lastName quando socialName ausente', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: 'u2',
        firstName: 'Bruno',
        lastName: 'Lima',
        socialName: null,
        role: { name: 'admin', supportAgent: true },
      });
      mockAuth.createCustomToken.mockResolvedValue('tk2');

      await service.issueTokenForUserId('u2');

      expect(mockAuth.createCustomToken).toHaveBeenCalledWith('u2', {
        userId: 'u2',
        role: 'support_agent',
        partnerPrepId: null,
        name: 'Bruno Lima',
      });
    });

    it("claim role is 'support_agent' when user.role.supportAgent === true", async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: 'u3',
        firstName: 'Carla',
        lastName: 'Reis',
        socialName: null,
        role: { name: 'aluno', supportAgent: true },
      });
      mockAuth.createCustomToken.mockResolvedValue('tk3');

      await service.issueTokenForUserId('u3');

      expect(mockAuth.createCustomToken).toHaveBeenCalledWith(
        'u3',
        expect.objectContaining({ role: 'support_agent' }),
      );
    });

    it("claim role is 'student' when user.role.supportAgent === false", async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: 'u4',
        firstName: 'Diego',
        lastName: 'Pires',
        socialName: null,
        role: { name: 'admin', supportAgent: false },
      });
      mockAuth.createCustomToken.mockResolvedValue('tk4');

      await service.issueTokenForUserId('u4');

      expect(mockAuth.createCustomToken).toHaveBeenCalledWith(
        'u4',
        expect.objectContaining({ role: 'student' }),
      );
    });

    it('lança UnauthorizedException quando userId ausente', async () => {
      await expect(service.issueTokenForUserId(undefined)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserRepo.findOneBy).not.toHaveBeenCalled();
    });

    it('lança NotFoundException quando user não encontrado', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      await expect(service.issueTokenForUserId('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockAuth.createCustomToken).not.toHaveBeenCalled();
    });
  });

  describe('openConversation', () => {
    const fixedNow = new Date('2026-04-28T12:00:00Z');
    let conversationsRef: {
      where: jest.Mock;
      orderBy: jest.Mock;
      limit: jest.Mock;
      get: jest.Mock;
      add: jest.Mock;
    };

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(fixedNow);

      conversationsRef = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn(),
        add: jest.fn().mockResolvedValue({ id: 'new-conv' }),
      };

      mockFirebase.firestore = () => ({
        collection: jest.fn().mockReturnValue(conversationsRef),
      });
    });

    afterEach(() => jest.useRealTimers());

    it('returns existing open conversation if any', async () => {
      conversationsRef.get.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'conv-existing',
            data: () => ({ status: 'open', userId: 'u1' }),
          },
        ],
      });

      const result = await service.openConversation('u1', 'João', {
        page: '/x',
        userAgent: 'UA',
        device: 'desktop',
        browser: 'chrome',
      });

      expect(result.id).toBe('conv-existing');
      expect(conversationsRef.add).not.toHaveBeenCalled();
    });

    it('throws 429 when cooldown active', async () => {
      // sem conversa aberta
      conversationsRef.get.mockResolvedValueOnce({ empty: true, docs: [] });
      // última fechada há 5 min (cooldown 15 min)
      const closedAt = new Date(fixedNow.getTime() - 5 * 60_000);
      conversationsRef.get.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'c-old',
            data: () => ({
              status: 'closed',
              closedAt: { toDate: () => closedAt },
            }),
          },
        ],
      });

      await expect(
        service.openConversation('u1', 'João', {
          page: '/',
          userAgent: 'UA',
          device: 'desktop',
          browser: 'chrome',
        }),
      ).rejects.toThrow(/cooldown/i);
    });

    it('creates new conversation when none open and cooldown passed', async () => {
      conversationsRef.get.mockResolvedValueOnce({ empty: true, docs: [] });
      conversationsRef.get.mockResolvedValueOnce({ empty: true, docs: [] });

      const result = await service.openConversation('u1', 'João', {
        page: '/y',
        userAgent: 'UA',
        device: 'desktop',
        browser: 'chrome',
      });

      expect(conversationsRef.add).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          userName: 'João',
          status: 'open',
          unreadCountStudent: 0,
          unreadCountSupport: 0,
        }),
      );
      expect(result.id).toBe('new-conv');
    });

    it('creates new conversation when last closed older than cooldown', async () => {
      conversationsRef.get.mockResolvedValueOnce({ empty: true, docs: [] });
      // fechada há 30 min
      const closedAt = new Date(fixedNow.getTime() - 30 * 60_000);
      conversationsRef.get.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'c-old',
            data: () => ({
              status: 'closed',
              closedAt: { toDate: () => closedAt },
            }),
          },
        ],
      });

      const result = await service.openConversation('u1', 'João', {
        page: '/y',
        userAgent: 'UA',
        device: 'desktop',
        browser: 'chrome',
      });

      expect(result.id).toBe('new-conv');
      expect(conversationsRef.add).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    let convDocRef: { get: jest.Mock; update: jest.Mock };
    let messagesDocRef: { id: string; set: jest.Mock };
    let messagesRef: { doc: jest.Mock };
    let txRunner: jest.Mock;
    let txOps: { set: jest.Mock; update: jest.Mock };

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-04-28T12:00:00Z'));
      convDocRef = {
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
      };
      messagesDocRef = { id: 'm1', set: jest.fn() };
      messagesRef = { doc: jest.fn().mockReturnValue(messagesDocRef) };
      txOps = {
        set: jest.fn(),
        update: jest.fn(),
      };
      txRunner = jest.fn(async (cb) => {
        await cb(txOps);
      });

      const collection = jest.fn((name: string) => {
        if (name === 'conversations') {
          return { doc: () => convDocRef };
        }
        if (name === 'messages') return messagesRef;
        return {};
      });

      mockFirebase.firestore = () => ({
        collection,
        runTransaction: txRunner,
      });
    });

    afterEach(() => jest.useRealTimers());

    it('rejects when conversation does not exist', async () => {
      convDocRef.get.mockResolvedValue({ exists: false });
      await expect(
        service.sendMessage({
          senderId: 'u1',
          senderName: 'A',
          senderType: 'student',
          conversationId: 'c-x',
          content: 'oi',
        }),
      ).rejects.toThrow(/não encontrada/i);
    });

    it('rejects when conversation is closed', async () => {
      convDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'closed', userId: 'u1' }),
      });
      await expect(
        service.sendMessage({
          senderId: 'u1',
          senderName: 'A',
          senderType: 'student',
          conversationId: 'c-x',
          content: 'oi',
        }),
      ).rejects.toThrow(/fechada/i);
    });

    it('rejects when student tries to write into someone else conversation', async () => {
      convDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'open', userId: 'OTHER' }),
      });
      await expect(
        service.sendMessage({
          senderId: 'u1',
          senderName: 'A',
          senderType: 'student',
          conversationId: 'c-x',
          content: 'oi',
        }),
      ).rejects.toThrow(/permissão/i);
    });

    it('rejects content > 1000 chars', async () => {
      convDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'open', userId: 'u1' }),
      });
      await expect(
        service.sendMessage({
          senderId: 'u1',
          senderName: 'A',
          senderType: 'student',
          conversationId: 'c-x',
          content: 'a'.repeat(1001),
        }),
      ).rejects.toThrow(/1000/);
    });

    it('rejects content empty after trim', async () => {
      convDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'open', userId: 'u1' }),
      });
      await expect(
        service.sendMessage({
          senderId: 'u1',
          senderName: 'A',
          senderType: 'student',
          conversationId: 'c-x',
          content: '   ',
        }),
      ).rejects.toThrow(/vazia/i);
    });

    it('writes message and updates conversation atomically (student → unreadCountSupport)', async () => {
      convDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'open', userId: 'u1' }),
      });

      const result = await service.sendMessage({
        senderId: 'u1',
        senderName: 'João',
        senderType: 'student',
        conversationId: 'c-x',
        content: '  oi  ',
      });

      expect(txRunner).toHaveBeenCalled();
      // mensagem persistida com content trim, conversationUserId denormalizado, expiresAt
      expect(txOps.set).toHaveBeenCalledWith(
        messagesDocRef,
        expect.objectContaining({
          conversationId: 'c-x',
          conversationUserId: 'u1',
          senderId: 'u1',
          senderName: 'João',
          senderType: 'student',
          content: 'oi',
        }),
      );
      const setPayload = txOps.set.mock.calls[0][1];
      expect(setPayload.expiresAt).toBeDefined();
      // unreadCountSupport incrementado (estudante enviou)
      expect(txOps.update).toHaveBeenCalledWith(
        convDocRef,
        expect.objectContaining({
          unreadCountSupport: expect.anything(),
        }),
      );
      expect(result.id).toBe('m1');
    });

    it('support sender increments unreadCountStudent', async () => {
      convDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'open', userId: 'u1' }),
      });

      await service.sendMessage({
        senderId: 'agent-1',
        senderName: 'Suporte',
        senderType: 'support',
        conversationId: 'c-x',
        content: 'olá',
      });

      expect(txOps.update).toHaveBeenCalledWith(
        convDocRef,
        expect.objectContaining({
          unreadCountStudent: expect.anything(),
        }),
      );
    });
  });

  describe('closeConversation', () => {
    let convDocRef: { get: jest.Mock; update: jest.Mock };

    beforeEach(() => {
      convDocRef = {
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
      };
      mockFirebase.firestore = () => ({
        collection: () => ({ doc: () => convDocRef }),
      });
    });

    it('rejects when conversation not found', async () => {
      convDocRef.get.mockResolvedValue({ exists: false });
      await expect(
        service.closeConversation('c1', 'u1', 'student'),
      ).rejects.toThrow(/não encontrada/i);
    });

    it('closes conversation marking who closed it (student)', async () => {
      convDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'open', userId: 'u1' }),
      });
      await service.closeConversation('c1', 'u1', 'student');
      expect(convDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'closed',
          closedBy: 'student',
        }),
      );
      const payload = convDocRef.update.mock.calls[0][0];
      expect(payload.closedAt).toBeDefined();
    });

    it('closes conversation when support closes (any conv)', async () => {
      convDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'open', userId: 'OTHER' }),
      });
      await service.closeConversation('c1', 'agent-1', 'support');
      expect(convDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'closed',
          closedBy: 'support',
        }),
      );
    });

    it('rejects student closing other user conv', async () => {
      convDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'open', userId: 'OTHER' }),
      });
      await expect(
        service.closeConversation('c1', 'u1', 'student'),
      ).rejects.toThrow(/permissão/i);
    });
  });

  describe('markRead', () => {
    let convDocRef: { get: jest.Mock; update: jest.Mock };

    beforeEach(() => {
      convDocRef = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ userId: 'u1' }),
        }),
        update: jest.fn().mockResolvedValue(undefined),
      };
      mockFirebase.firestore = () => ({
        collection: () => ({ doc: () => convDocRef }),
      });
    });

    it('rejects when conversation not found', async () => {
      convDocRef.get.mockResolvedValue({ exists: false });
      await expect(
        service.markRead('c1', 'u1', 'student'),
      ).rejects.toThrow(/não encontrada/i);
    });

    it('resets student unread counter', async () => {
      await service.markRead('c1', 'u1', 'student');
      expect(convDocRef.update).toHaveBeenCalledWith({ unreadCountStudent: 0 });
    });

    it('resets support unread counter', async () => {
      await service.markRead('c1', 'agent-1', 'support');
      expect(convDocRef.update).toHaveBeenCalledWith({ unreadCountSupport: 0 });
    });

    it('rejects student marking another user conv as read', async () => {
      convDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ userId: 'OTHER' }),
      });
      await expect(
        service.markRead('c1', 'u1', 'student'),
      ).rejects.toThrow(/permissão/i);
    });

    it('zera unreadCount mesmo em conversa fechada (intencional)', async () => {
      convDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'closed', userId: 'u1' }),
      });
      await service.markRead('c1', 'u1', 'student');
      expect(convDocRef.update).toHaveBeenCalledWith({ unreadCountStudent: 0 });
    });
  });

  describe('resolveActorType', () => {
    it("returns 'support' when user.role.supportAgent === true", async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: 'u1',
        role: { supportAgent: true },
      });
      const t = await service.resolveActorType('u1');
      expect(t).toBe('support');
    });

    it("returns 'student' when supportAgent === false", async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: 'u2',
        role: { supportAgent: false },
      });
      expect(await service.resolveActorType('u2')).toBe('student');
    });

    it('throws Unauthorized when user not found', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);
      await expect(service.resolveActorType('missing')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws Unauthorized when user has no role', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({ id: 'u3', role: null });
      await expect(service.resolveActorType('u3')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('initiateConversation', () => {
    const mockTx = {
      set: jest.fn(),
      update: jest.fn(),
    };
    const mockMessageDoc = { id: 'msg1' };
    const mockConvDoc = { id: 'conv1' };
    const mockMessagesCol = { doc: jest.fn(() => mockMessageDoc) };
    const mockConvsCol = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn(),
      doc: jest.fn(() => mockConvDoc),
    };
    const mockFirestore = {
      collection: jest.fn((name: string) =>
        name === 'conversations' ? mockConvsCol : mockMessagesCol,
      ),
      runTransaction: jest.fn(async (fn: (tx: typeof mockTx) => unknown) =>
        fn(mockTx),
      ),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      // Match the existing reassignment pattern used elsewhere in this file
      // (see e.g. mockFirebase.firestore = () => ({...}) on line ~141).
      mockFirebase.firestore = () => mockFirestore;
    });

    it('cria conversation + primeira mensagem quando não existe conv aberta', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: 'student1',
        firstName: 'Ana',
        lastName: 'Souza',
        socialName: null,
        useSocialName: false,
        role: { name: 'estudante', supportAgent: false },
      });
      mockConvsCol.get.mockResolvedValue({ empty: true, docs: [] });

      const result = await service.initiateConversation(
        'support1',
        'Carlos Suporte',
        'student1',
        'Olá, vi sua matrícula',
      );

      expect(result).toEqual({ conversationId: 'conv1', messageId: 'msg1' });
      expect(mockTx.set).toHaveBeenCalledTimes(2);
      expect(mockTx.update).not.toHaveBeenCalled();
    });

    it('append msg na conv existente quando já há conv aberta (idempotente)', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: 'student1',
        firstName: 'Ana',
        lastName: 'Souza',
        socialName: null,
        useSocialName: false,
        role: { name: 'aluno', supportAgent: false },
      });
      const existingRef = { id: 'existingConv' };
      mockConvsCol.get.mockResolvedValue({
        empty: false,
        docs: [{ ref: existingRef }],
      });

      const result = await service.initiateConversation(
        'support1',
        'Carlos',
        'student1',
        'Mensagem nova',
      );

      expect(result.conversationId).toBe('existingConv');
      expect(result.messageId).toBe('msg1');
      expect(mockTx.set).toHaveBeenCalledTimes(1); // só a msg, não a conv
      expect(mockTx.update).toHaveBeenCalledTimes(1); // atualiza conv existente
    });

    it('rejeita se role do target ≠ aluno|estudante', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: 'admin1',
        firstName: 'X',
        lastName: 'Y',
        role: { name: 'admin', supportAgent: false },
      });

      await expect(
        service.initiateConversation('s1', 'Sup', 'admin1', 'oi'),
      ).rejects.toThrow(/Apenas estudantes/);
    });

    it('lança NotFound quando target user não existe', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.initiateConversation('s1', 'Sup', 'ghost', 'oi'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolveTokenClaims', () => {
    it('returns support_agent with partnerPrepId=null for global support', async () => {
      // user with supportAgent=true — no collaborator lookup needed
      const claims = await service['resolveTokenClaims']({
        role: { supportAgent: true, partnerPrepSupportAgent: false },
      } as any);
      expect(claims).toEqual({ role: 'support_agent', partnerPrepId: null });
    });

    it('returns support_agent with partnerPrepId for partner support with valid collaborator', async () => {
      mockCollaboratorRepository.findOneByUserId.mockResolvedValue({
        partnerPrepCourse: { id: 'prep-uuid-123' },
      });
      const claims = await service['resolveTokenClaims']({
        id: 'user-2',
        role: { supportAgent: false, partnerPrepSupportAgent: true },
      } as any);
      expect(claims).toEqual({ role: 'support_agent', partnerPrepId: 'prep-uuid-123' });
    });

    it('returns student when partnerPrepSupportAgent=true but no collaborator row', async () => {
      mockCollaboratorRepository.findOneByUserId.mockResolvedValue(null);
      const claims = await service['resolveTokenClaims']({
        id: 'user-3',
        role: { supportAgent: false, partnerPrepSupportAgent: true },
      } as any);
      expect(claims).toEqual({ role: 'student', partnerPrepId: null });
    });

    it('returns student for regular user', async () => {
      const claims = await service['resolveTokenClaims']({
        id: 'user-4',
        role: { supportAgent: false, partnerPrepSupportAgent: false },
      } as any);
      expect(claims).toEqual({ role: 'student', partnerPrepId: null });
    });
  });
});
