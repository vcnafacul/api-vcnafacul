import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InscriptionCourseRepository } from 'src/modules/prepCourse/InscriptionCourse/inscription-course.repository';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { CollaboratorRepository } from 'src/modules/prepCourse/collaborator/collaborator.repository';
import { UserRepository } from 'src/modules/user/user.repository';
import {
  ChatService,
  INTERVALO_PUSH_DO_CHAT_MS,
  deveAvisarEstudante,
  deveAvisarSuporte,
} from './chat.service';
import { FirebaseService } from 'src/shared/modules/firebase/firebase.service';
import { PushService } from 'src/modules/push/push.service';

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
  const mockUserRepo = {
    findOneBy: jest.fn(),
    idsDoSuporteDoProjeto: jest.fn(),
  };
  const mockCollaboratorRepository = {
    findOneByUserId: jest.fn(),
    idsDoSuporteDoCursinho: jest.fn(),
  };
  const mockInscriptionCourseRepository = { findOneWithPartnerPrep: jest.fn() };
  const mockStudentCourseRepository = { findOneWithPartnerPrep: jest.fn() };
  const mockPush = { sendToUsers: jest.fn().mockResolvedValue(undefined) };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChatService(
      mockFirebase as unknown as FirebaseService,
      mockUserRepo as unknown as UserRepository,
      mockCollaboratorRepository as unknown as CollaboratorRepository,
      mockInscriptionCourseRepository as unknown as InscriptionCourseRepository,
      mockStudentCourseRepository as unknown as StudentCourseRepository,
      mockPush as unknown as PushService,
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

    it('stores partnerPrepId on conversation when inscriptionCourseId provided', async () => {
      conversationsRef.get.mockResolvedValueOnce({ empty: true, docs: [] });
      conversationsRef.get.mockResolvedValueOnce({ empty: true, docs: [] });
      mockInscriptionCourseRepository.findOneWithPartnerPrep.mockResolvedValue({
        partnerPrepCourse: { id: 'prep-xyz' },
      });

      await service.openConversation(
        'u1',
        'João',
        { page: '/y', userAgent: 'UA', device: 'desktop', browser: 'chrome' },
        { inscriptionCourseId: 'ic-uuid' },
      );

      expect(conversationsRef.add).toHaveBeenCalledWith(
        expect.objectContaining({ partnerPrepId: 'prep-xyz' }),
      );
    });

    it('⚠️ procura a conversa aberta DO DESTINO da página (tickets/031, card 02)', async () => {
      conversationsRef.get.mockResolvedValueOnce({ empty: true, docs: [] });
      conversationsRef.get.mockResolvedValueOnce({ empty: true, docs: [] });
      mockInscriptionCourseRepository.findOneWithPartnerPrep.mockResolvedValue({
        partnerPrepCourse: { id: 'cursinho-A' },
      });

      await service.openConversation(
        'u1',
        'João',
        { page: '/y', userAgent: 'UA', device: 'desktop', browser: 'chrome' },
        { inscriptionCourseId: 'ic-uuid' },
      );

      // 1ª busca: a aberta, já filtrada pelo cursinho A (não "qualquer aberta").
      expect(conversationsRef.where.mock.calls.slice(0, 3)).toEqual([
        ['userId', '==', 'u1'],
        ['status', '==', 'open'],
        ['partnerPrepId', '==', 'cursinho-A'],
      ]);
    });

    it('sem contexto, o destino é o projeto (partnerPrepId null)', async () => {
      conversationsRef.get.mockResolvedValueOnce({ empty: true, docs: [] });
      conversationsRef.get.mockResolvedValueOnce({ empty: true, docs: [] });

      await service.openConversation('u1', 'João', {
        page: '/y',
        userAgent: 'UA',
        device: 'desktop',
        browser: 'chrome',
      });

      expect(conversationsRef.where).toHaveBeenNthCalledWith(
        3,
        'partnerPrepId',
        '==',
        null,
      );
      expect(conversationsRef.add).toHaveBeenCalledWith(
        expect.objectContaining({ partnerPrepId: null }),
      );
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
      mockUserRepo.findOneBy.mockResolvedValue({
        role: { supportAgent: true },
      });
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

    it('closes conversation when support closes (suporte do projeto: qualquer conv)', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        role: { supportAgent: true },
      });
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
      await expect(service.markRead('c1', 'u1', 'student')).rejects.toThrow(
        /não encontrada/i,
      );
    });

    it('resets student unread counter', async () => {
      await service.markRead('c1', 'u1', 'student');
      expect(convDocRef.update).toHaveBeenCalledWith({ unreadCountStudent: 0 });
    });

    it('resets support unread counter', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        role: { supportAgent: true },
      });
      await service.markRead('c1', 'agent-1', 'support');
      expect(convDocRef.update).toHaveBeenCalledWith({ unreadCountSupport: 0 });
    });

    it('rejects student marking another user conv as read', async () => {
      convDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ userId: 'OTHER' }),
      });
      await expect(service.markRead('c1', 'u1', 'student')).rejects.toThrow(
        /permissão/i,
      );
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
      // Quem inicia é o suporte do projeto; o escopo tem testes próprios.
      jest
        .spyOn(
          service as unknown as { escopoDoSuporte: () => Promise<unknown> },
          'escopoDoSuporte',
        )
        .mockResolvedValue({ global: true, partnerPrepId: null });
    });

    it('⚠️ só reaproveita a conversa do PROJETO e grava partnerPrepId: null', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: 'student1',
        firstName: 'Ana',
        lastName: 'Souza',
        socialName: null,
        useSocialName: false,
        role: { name: 'estudante', supportAgent: false },
      });
      mockConvsCol.get.mockResolvedValue({ empty: true, docs: [] });

      await service.initiateConversation('support1', 'Sup', 'student1', 'oi');

      expect(mockConvsCol.where).toHaveBeenCalledWith(
        'partnerPrepId',
        '==',
        null,
      );
      const conv = mockTx.set.mock.calls.find(
        ([ref]) => ref === mockConvDoc,
      )?.[1];
      expect(conv).toEqual(expect.objectContaining({ partnerPrepId: null }));
      expect(Object.prototype.hasOwnProperty.call(conv, 'partnerPrepId')).toBe(
        true,
      );
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

  describe('resolveConversationContext', () => {
    it('resolves context from inscriptionCourseId', async () => {
      mockInscriptionCourseRepository.findOneWithPartnerPrep.mockResolvedValue({
        partnerPrepCourse: { id: 'prep-aaa', geo: { name: 'Cursinho ABC' } },
      });
      const ctx = await service['resolveConversationContext']({
        inscriptionCourseId: 'ic-uuid',
      });
      expect(ctx).toEqual({
        partnerPrepId: 'prep-aaa',
        cursinhoName: 'Cursinho ABC',
        originLabel: 'Formulário de inscrição',
      });
    });

    it('resolves context from declaredInterestInscriptionCourseId', async () => {
      mockInscriptionCourseRepository.findOneWithPartnerPrep.mockResolvedValue({
        partnerPrepCourse: { id: 'prep-ccc', geo: { name: 'Cursinho DEF' } },
      });
      const ctx = await service['resolveConversationContext']({
        declaredInterestInscriptionCourseId: 'ic-uuid',
      });
      expect(
        mockInscriptionCourseRepository.findOneWithPartnerPrep,
      ).toHaveBeenCalledWith('ic-uuid');
      expect(
        mockStudentCourseRepository.findOneWithPartnerPrep,
      ).not.toHaveBeenCalled();
      expect(ctx).toEqual({
        partnerPrepId: 'prep-ccc',
        cursinhoName: 'Cursinho DEF',
        originLabel: 'Declaração de interesse',
      });
    });

    it('resolves context from studentCourseId', async () => {
      mockStudentCourseRepository.findOneWithPartnerPrep.mockResolvedValue({
        partnerPrepCourse: { id: 'prep-bbb', geo: { name: 'Cursinho XYZ' } },
      });
      const ctx = await service['resolveConversationContext']({
        studentCourseId: 'sc-uuid',
      });
      expect(ctx).toEqual({
        partnerPrepId: 'prep-bbb',
        cursinhoName: 'Cursinho XYZ',
        originLabel: 'Declaração de interesse',
      });
    });

    it('returns nulls when no identifier provided', async () => {
      const ctx = await service['resolveConversationContext']({});
      expect(ctx).toEqual({
        partnerPrepId: null,
        cursinhoName: null,
        originLabel: null,
      });
    });

    it('returns null partnerPrepId when inscription not found', async () => {
      mockInscriptionCourseRepository.findOneWithPartnerPrep.mockResolvedValue(
        null,
      );
      const ctx = await service['resolveConversationContext']({
        inscriptionCourseId: 'bad-id',
      });
      expect(ctx.partnerPrepId).toBeNull();
      expect(ctx.originLabel).toBe('Formulário de inscrição');
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
      expect(claims).toEqual({
        role: 'support_agent',
        partnerPrepId: 'prep-uuid-123',
      });
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

  describe('escopo do suporte (tickets/031, card 01)', () => {
    let convDocRef: { get: jest.Mock; update: jest.Mock };
    const txOps = { set: jest.fn(), update: jest.fn() };

    const conversaDo = (partnerPrepId: string | null | undefined) =>
      convDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'open', userId: 'aluno', partnerPrepId }),
      });
    const colaboradorDo = (partnerPrepId: string | null) => {
      mockUserRepo.findOneBy.mockResolvedValue({
        role: { supportAgent: false, partnerPrepSupportAgent: true },
      });
      mockCollaboratorRepository.findOneByUserId.mockResolvedValue(
        partnerPrepId ? { partnerPrepCourse: { id: partnerPrepId } } : null,
      );
    };
    const enviar = () =>
      service.sendMessage({
        senderId: 'agente',
        senderName: 'Agente',
        senderType: 'support',
        conversationId: 'c1',
        content: 'oi',
      });

    beforeEach(() => {
      convDocRef = {
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
      };
      mockFirebase.firestore = () => ({
        collection: (name: string) =>
          name === 'conversations'
            ? { doc: () => convDocRef }
            : { doc: () => ({ id: 'm1' }) },
        runTransaction: jest.fn(async (cb) => cb(txOps)),
      });
    });

    it.each([
      ['enviar', () => enviar()],
      ['fechar', () => service.closeConversation('c1', 'agente', 'support')],
      ['marcar lida', () => service.markRead('c1', 'agente', 'support')],
    ])(
      '⚠️ colaborador do cursinho A não consegue %s conversa do B nem do projeto',
      async (_acao, agir) => {
        colaboradorDo('A');
        for (const destino of ['B', null, undefined]) {
          conversaDo(destino);
          await expect(agir()).rejects.toThrow(/permissão/i);
        }
        expect(convDocRef.update).not.toHaveBeenCalled();
        expect(txOps.set).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['enviar', () => enviar()],
      ['fechar', () => service.closeConversation('c1', 'agente', 'support')],
      ['marcar lida', () => service.markRead('c1', 'agente', 'support')],
    ])('colaborador do A consegue %s conversa do A', async (_acao, agir) => {
      colaboradorDo('A');
      conversaDo('A');
      await expect(agir()).resolves.not.toThrow();
    });

    it('colaborador sem cursinho não age em conversa nenhuma', async () => {
      colaboradorDo(null);
      conversaDo(null);
      await expect(enviar()).rejects.toThrow(/permissão/i);
    });

    it('suporte do projeto age em conversa de qualquer cursinho', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        role: { supportAgent: true },
      });
      conversaDo('B');
      await expect(enviar()).resolves.toEqual({ id: 'm1' });
      expect(mockCollaboratorRepository.findOneByUserId).not.toHaveBeenCalled();
    });

    it('conversa fechada de outro cursinho: 403 antes de dizer que está fechada', async () => {
      colaboradorDo('A');
      convDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'closed', userId: 'aluno', partnerPrepId: 'B' }),
      });
      await expect(enviar()).rejects.toThrow(/permissão/i);
    });

    it('⚠️ colaborador não inicia conversa', async () => {
      colaboradorDo('A');
      await expect(
        service.initiateConversation('agente', 'Agente', 'aluno', 'oi'),
      ).rejects.toThrow(/suporte do projeto/i);
    });
  });

  describe('push da mensagem do suporte (tickets/031, card 07)', () => {
    const AGORA = new Date('2026-10-02T12:00:00Z').getTime();
    let convDocRef: { get: jest.Mock; update: jest.Mock };
    const txOps = { set: jest.fn(), update: jest.fn() };

    const conversa = (extra: Record<string, unknown> = {}) =>
      convDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({
          status: 'open',
          userId: 'aluno',
          partnerPrepId: null,
          unreadCountStudent: 0,
          ...extra,
        }),
      });
    const enviar = (senderType: 'support' | 'student', content = 'Oi!') =>
      service.sendMessage({
        senderId: senderType === 'support' ? 'agente' : 'aluno',
        senderName: 'X',
        senderType,
        conversationId: 'c1',
        content,
      });

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(AGORA);
      txOps.update.mockClear();
      mockPush.sendToUsers.mockReset().mockResolvedValue(undefined);
      mockUserRepo.findOneBy.mockResolvedValue({
        role: { supportAgent: true },
      });
      convDocRef = { get: jest.fn(), update: jest.fn() };
      mockFirebase.firestore = () => ({
        collection: (name: string) =>
          name === 'conversations'
            ? { doc: () => convDocRef }
            : { doc: () => ({ id: 'm1' }) },
        runTransaction: jest.fn(async (cb) => cb(txOps)),
      });
    });
    afterEach(() => jest.useRealTimers());

    it('regra: sem não lidas avisa; com não lidas, só 10 min depois do último', () => {
      const ts = (ms: number) => ({ toMillis: () => ms });
      expect(deveAvisarEstudante({ unreadCountStudent: 0 }, AGORA)).toBe(true);
      expect(
        deveAvisarEstudante(
          { unreadCountStudent: 3, ultimoPushEstudanteEm: ts(AGORA - 60_000) },
          AGORA,
        ),
      ).toBe(false);
      expect(
        deveAvisarEstudante(
          {
            unreadCountStudent: 3,
            ultimoPushEstudanteEm: ts(AGORA - INTERVALO_PUSH_DO_CHAT_MS),
          },
          AGORA,
        ),
      ).toBe(true);
    });

    it('mensagem do suporte → push para o estudante, com o link da conversa', async () => {
      conversa({ partnerPrepId: 'A', cursinhoName: 'Cursinho Alfa' });
      await enviar('support', 'Sua matrícula foi confirmada');
      await Promise.resolve();

      expect(mockPush.sendToUsers).toHaveBeenCalledWith(['aluno'], {
        title: 'Cursinho Alfa',
        body: 'Sua matrícula foi confirmada',
        url: '/dashboard?conversa=c1',
        tag: 'chat-c1',
      });
      // O ritmo é gravado junto com a mensagem.
      expect(txOps.update.mock.calls[0][1]).toHaveProperty(
        'ultimoPushEstudanteEm',
      );
    });

    it('do projeto: título "Suporte Você na Facul"; texto longo é cortado', async () => {
      conversa();
      await enviar('support', 'a'.repeat(300));
      await Promise.resolve();

      const [, payload] = mockPush.sendToUsers.mock.calls[0];
      expect(payload.title).toBe('Suporte Você na Facul');
      expect(payload.body.length).toBeLessThanOrEqual(120);
      expect(payload.body.endsWith('…')).toBe(true);
    });

    it('ainda não leu e o último push foi há 1 min → sem push novo', async () => {
      conversa({
        unreadCountStudent: 2,
        ultimoPushEstudanteEm: { toMillis: () => AGORA - 60_000 },
      });
      await enviar('support');
      await Promise.resolve();

      expect(mockPush.sendToUsers).not.toHaveBeenCalled();
      expect(txOps.update.mock.calls[0][1]).not.toHaveProperty(
        'ultimoPushEstudanteEm',
      );
    });

    it('mensagem do estudante → nenhum push para o próprio estudante', async () => {
      conversa();
      mockUserRepo.idsDoSuporteDoProjeto.mockResolvedValue([]);
      await enviar('student');
      await Promise.resolve();
      await Promise.resolve();
      expect(mockPush.sendToUsers).not.toHaveBeenCalledWith(
        ['aluno'],
        expect.anything(),
      );
    });

    it('⚠️ push falhando não derruba o envio da mensagem', async () => {
      conversa();
      mockPush.sendToUsers.mockRejectedValue(new Error('push desligado'));
      await expect(enviar('support')).resolves.toEqual({ id: 'm1' });
    });
  });

  describe('push da mensagem do estudante para o suporte (tickets/031)', () => {
    const AGORA = new Date('2026-10-02T12:00:00Z').getTime();
    let convDocRef: { get: jest.Mock; update: jest.Mock };
    const txOps = { set: jest.fn(), update: jest.fn() };
    const esperar = async () => {
      for (let i = 0; i < 5; i++) await Promise.resolve();
    };

    const conversa = (extra: Record<string, unknown> = {}) =>
      convDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({
          status: 'open',
          userId: 'aluno',
          userName: 'Ana Souza',
          partnerPrepId: null,
          unreadCountSupport: 0,
          ...extra,
        }),
      });
    const estudanteEnvia = (content = 'Preciso de ajuda') =>
      service.sendMessage({
        senderId: 'aluno',
        senderName: 'Ana',
        senderType: 'student',
        conversationId: 'c1',
        content,
      });

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(AGORA);
      txOps.update.mockClear();
      mockPush.sendToUsers.mockReset().mockResolvedValue(undefined);
      mockUserRepo.idsDoSuporteDoProjeto
        .mockReset()
        .mockResolvedValue(['s1', 's2']);
      mockCollaboratorRepository.idsDoSuporteDoCursinho
        .mockReset()
        .mockResolvedValue(['colab-a1', 'colab-a2']);
      convDocRef = { get: jest.fn(), update: jest.fn() };
      mockFirebase.firestore = () => ({
        collection: (name: string) =>
          name === 'conversations'
            ? { doc: () => convDocRef }
            : { doc: () => ({ id: 'm1' }) },
        runTransaction: jest.fn(async (cb) => cb(txOps)),
      });
    });
    afterEach(() => jest.useRealTimers());

    it('regra: mesma do estudante, com os campos do suporte', () => {
      expect(deveAvisarSuporte({ unreadCountSupport: 0 }, AGORA)).toBe(true);
      expect(
        deveAvisarSuporte(
          {
            unreadCountSupport: 1,
            ultimoPushSuporteEm: { toMillis: () => AGORA - 60_000 },
          },
          AGORA,
        ),
      ).toBe(false);
    });

    it('conversa do projeto → toda a equipe do projeto, abrindo /dashboard/suporte', async () => {
      conversa();
      await estudanteEnvia();
      await esperar();

      expect(
        mockCollaboratorRepository.idsDoSuporteDoCursinho,
      ).not.toHaveBeenCalled();
      expect(mockPush.sendToUsers).toHaveBeenCalledWith(['s1', 's2'], {
        title: 'Ana Souza',
        body: 'Preciso de ajuda',
        url: '/dashboard/suporte?conversa=c1',
        tag: 'chat-suporte-c1',
      });
      expect(txOps.update.mock.calls[0][1]).toHaveProperty(
        'ultimoPushSuporteEm',
      );
    });

    it('⚠️ conversa de um cursinho → só os colaboradores dele; o suporte do projeto não', async () => {
      conversa({ partnerPrepId: 'A' });
      await estudanteEnvia();
      await esperar();

      expect(
        mockCollaboratorRepository.idsDoSuporteDoCursinho,
      ).toHaveBeenCalledWith('A');
      expect(mockUserRepo.idsDoSuporteDoProjeto).not.toHaveBeenCalled();
      expect(mockPush.sendToUsers).toHaveBeenCalledWith(
        ['colab-a1', 'colab-a2'],
        expect.objectContaining({
          url: '/dashboard/suporte-cursinho?conversa=c1',
        }),
      );
    });

    it('ninguém leu e o último aviso foi há 1 min → sem push novo', async () => {
      conversa({
        unreadCountSupport: 3,
        ultimoPushSuporteEm: { toMillis: () => AGORA - 60_000 },
      });
      await estudanteEnvia();
      await esperar();
      expect(mockPush.sendToUsers).not.toHaveBeenCalled();
    });

    it('cursinho sem ninguém com a permissão → nenhum envio', async () => {
      conversa({ partnerPrepId: 'A' });
      mockCollaboratorRepository.idsDoSuporteDoCursinho.mockResolvedValue([]);
      await estudanteEnvia();
      await esperar();
      expect(mockPush.sendToUsers).not.toHaveBeenCalled();
    });

    it('⚠️ falha no push do suporte não derruba a mensagem do estudante', async () => {
      conversa();
      mockPush.sendToUsers.mockRejectedValue(new Error('FCM fora'));
      await expect(estudanteEnvia()).resolves.toEqual({ id: 'm1' });
    });
  });
});
