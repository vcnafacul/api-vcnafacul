import { NotFoundException, UnauthorizedException } from '@nestjs/common';
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
});
