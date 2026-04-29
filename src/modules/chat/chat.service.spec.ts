import { NotFoundException, UnauthorizedException } from '@nestjs/common';
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

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChatService(
      mockFirebase as unknown as FirebaseService,
      mockUserRepo as unknown as UserRepository,
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
});
