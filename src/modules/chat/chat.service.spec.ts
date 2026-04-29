import { ChatService } from './chat.service';
import { FirebaseService } from './firebase/firebase.service';
import { UserRepository } from 'src/modules/user/user.repository';

describe('ChatService', () => {
  let service: ChatService;
  const mockAuth = { createCustomToken: jest.fn() };
  const mockFirebase = {
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

  describe('generateCustomToken', () => {
    it('builds claims with userId, role, name (uses socialName when present)', async () => {
      mockAuth.createCustomToken.mockResolvedValue('fake-token');
      const user = {
        id: 'user-1',
        name: 'João Silva',
        socialName: 'Joana Silva',
        role: { name: 'aluno' },
      };

      const token = await service.generateCustomToken(user as any);

      expect(token).toBe('fake-token');
      expect(mockAuth.createCustomToken).toHaveBeenCalledWith('user-1', {
        userId: 'user-1',
        role: 'aluno',
        name: 'Joana Silva',
      });
    });

    it('falls back to name when socialName empty', async () => {
      mockAuth.createCustomToken.mockResolvedValue('t');
      await service.generateCustomToken({
        id: 'u',
        name: 'João',
        socialName: null,
        role: { name: 'aluno' },
      } as any);

      expect(mockAuth.createCustomToken).toHaveBeenCalledWith('u', {
        userId: 'u',
        role: 'aluno',
        name: 'João',
      });
    });
  });

  describe('issueTokenForUserId', () => {
    it('busca user no banco e gera token com claims formatados (com socialName)', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: 'u1',
        firstName: 'Ana',
        lastName: 'Souza',
        socialName: 'Aninha',
        role: { name: 'aluno' },
      });
      mockAuth.createCustomToken.mockResolvedValue('tk');

      const token = await service.issueTokenForUserId('u1');

      expect(token).toBe('tk');
      expect(mockUserRepo.findOneBy).toHaveBeenCalledWith({ id: 'u1' });
      expect(mockAuth.createCustomToken).toHaveBeenCalledWith('u1', {
        userId: 'u1',
        role: 'aluno',
        name: 'Aninha Souza',
      });
    });

    it('usa firstName + lastName quando socialName ausente', async () => {
      mockUserRepo.findOneBy.mockResolvedValue({
        id: 'u2',
        firstName: 'Bruno',
        lastName: 'Lima',
        socialName: null,
        role: { name: 'support_agent' },
      });
      mockAuth.createCustomToken.mockResolvedValue('tk2');

      await service.issueTokenForUserId('u2');

      expect(mockAuth.createCustomToken).toHaveBeenCalledWith('u2', {
        userId: 'u2',
        role: 'support_agent',
        name: 'Bruno Lima',
      });
    });

    it('lança 401 quando userId ausente', async () => {
      await expect(
        service.issueTokenForUserId(undefined),
      ).rejects.toMatchObject({ status: 401 });
      expect(mockUserRepo.findOneBy).not.toHaveBeenCalled();
    });

    it('lança 404 quando user não encontrado', async () => {
      mockUserRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.issueTokenForUserId('missing'),
      ).rejects.toMatchObject({ status: 404 });
      expect(mockAuth.createCustomToken).not.toHaveBeenCalled();
    });
  });
});
