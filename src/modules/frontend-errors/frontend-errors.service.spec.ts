import { FrontendErrorsService } from './frontend-errors.service';
import { LokiLoggerService } from '../../logger/loki-logger';
import { DiscordWebhook } from '../../shared/services/webhooks/discord';
import { UserRepository } from '../user/user.repository';
import { FrontendErrorBodyDto } from './dto/frontend-error.dto';

describe('FrontendErrorsService', () => {
  let service: FrontendErrorsService;
  let logger: jest.Mocked<Pick<LokiLoggerService, 'error'>>;
  let discord: jest.Mocked<Pick<DiscordWebhook, 'sendMessage'>>;
  let userRepo: jest.Mocked<Pick<UserRepository, 'findOneBy'>>;

  beforeEach(() => {
    logger = { error: jest.fn() };
    discord = { sendMessage: jest.fn().mockResolvedValue(undefined) };
    userRepo = { findOneBy: jest.fn().mockResolvedValue(null) };
    service = new FrontendErrorsService(
      logger as unknown as LokiLoggerService,
      discord as unknown as DiscordWebhook,
      userRepo as unknown as UserRepository,
    );
  });

  describe('sanitize', () => {
    it('retorna payload com whitelist aplicada e ignora campos não permitidos', () => {
      const body: FrontendErrorBodyDto = {
        errorType: 'FETCH_ERROR',
        message: 'Failed to fetch',
        page: '/courses/123',
        origin: 'fetchWrapper',
        request: { method: 'GET', url: '/api/courses/123' },
        metadata: {
          userAgent: 'Mozilla/5.0',
          online: true,
          release: '1.0.0',
        },
      };
      const result = service.sanitize(body, '127.0.0.1');
      expect(result.source).toBe('frontend');
      expect(result.errorType).toBe('FETCH_ERROR');
      expect(result.message).toBe('Failed to fetch');
      expect(result.page).toBe('/courses/123');
      expect(result.origin).toBe('fetchWrapper');
      expect(result.request).toEqual({ method: 'GET', url: '/api/courses/123' });
      expect(result.metadata).toEqual({
        userAgent: 'Mozilla/5.0',
        online: true,
        release: '1.0.0',
      });
      expect(result.ip).toBe('127.0.0.1');
      expect(result.severity).toBe('severe');
    });

    it('trunca message em 500 caracteres', () => {
      const long = 'x'.repeat(600);
      const result = service.sanitize({ message: long });
      expect(result.message).toHaveLength(500);
      expect(result.message).toBe('x'.repeat(500));
    });

    it('trunca errorDetail em 1000 caracteres', () => {
      const long = 'e'.repeat(1500);
      const result = service.sanitize({ errorDetail: long });
      expect(result.errorDetail).toHaveLength(1000);
    });

    it('aceita body vazio e preenche apenas source e severity', () => {
      const result = service.sanitize({});
      expect(result.source).toBe('frontend');
      expect(result.severity).toBe('normal');
      expect(result.message).toBeUndefined();
      expect(result.request).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });

    it('não inclui request quando body.request não é objeto', () => {
      const result = service.sanitize({
        message: 'err',
        request: null as any,
      });
      expect(result.request).toBeUndefined();
    });

    it('não inclui metadata quando body.metadata não é objeto', () => {
      const result = service.sanitize({
        message: 'err',
        metadata: 'invalid' as any,
      });
      expect(result.metadata).toBeUndefined();
    });

    it('marca severity severe para FETCH_ERROR', () => {
      expect(service.sanitize({ errorType: 'FETCH_ERROR', message: 'x' }).severity).toBe('severe');
    });

    it('marca severity severe quando message contém "failed to fetch"', () => {
      expect(service.sanitize({ message: 'Failed to fetch' }).severity).toBe('severe');
    });

    it('marca severity severe quando message contém "network"', () => {
      expect(service.sanitize({ message: 'Network error' }).severity).toBe('severe');
    });

    it('marca severity severe quando message contém "load failed"', () => {
      expect(service.sanitize({ message: 'Load failed' }).severity).toBe('severe');
    });

    it('marca severity normal para mensagem genérica', () => {
      expect(service.sanitize({ message: 'Something went wrong' }).severity).toBe('normal');
    });
  });

  describe('capture', () => {
    it('chama logger.error com payload incluindo userId do JWT', async () => {
      const sanitized = service.sanitize({
        errorType: 'OTHER',
        message: 'test',
      });
      await service.capture(sanitized, 'user-uuid-123');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'frontend',
          userId: 'user-uuid-123',
          message: 'test',
          severity: 'normal',
        }),
      );
    });

    it('não chama discord quando severity é normal', async () => {
      const sanitized = service.sanitize({ message: 'validation error' });
      await service.capture(sanitized);
      expect(logger.error).toHaveBeenCalled();
      expect(discord.sendMessage).not.toHaveBeenCalled();
    });

    it('chama discord quando severity é severe', async () => {
      const sanitized = service.sanitize({
        errorType: 'FETCH_ERROR',
        message: 'Failed to fetch',
        page: '/dashboard',
        origin: 'fetchWrapper',
        request: { method: 'POST', url: '/api/save' },
      });
      await service.capture(sanitized, 'user-456');
      expect(logger.error).toHaveBeenCalled();
      expect(discord.sendMessage).toHaveBeenCalledTimes(1);
      const discordText = discord.sendMessage.mock.calls[0][0];
      expect(discordText).toContain('[Frontend Error]');
      expect(discordText).toContain('FETCH_ERROR');
      expect(discordText).toContain('Failed to fetch');
      expect(discordText).toContain('/dashboard');
      expect(discordText).toContain('UserId: user-456');
      expect(discordText).toContain('POST');
      expect(discordText).toContain('/api/save');
    });

    it('usa userId do sanitized quando userIdFromJwt não é passado', async () => {
      const sanitized = service.sanitize({ message: 'err' });
      (sanitized as any).userId = 'from-sanitized';
      await service.capture(sanitized);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'from-sanitized',
        }),
      );
    });

    it('mostra email do usuário no Discord quando encontrado no banco', async () => {
      userRepo.findOneBy.mockResolvedValue({ email: 'user@example.com' } as any);
      const sanitized = service.sanitize({
        errorType: 'FETCH_ERROR',
        message: 'Failed to fetch',
      });
      await service.capture(sanitized, 'user-uuid');
      const discordText = discord.sendMessage.mock.calls[0][0];
      expect(discordText).toContain('User: user@example.com');
      expect(discordText).not.toContain('UserId:');
    });

    it('mostra UserId como fallback quando usuário não é encontrado', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      const sanitized = service.sanitize({
        errorType: 'FETCH_ERROR',
        message: 'Failed to fetch',
      });
      await service.capture(sanitized, 'user-uuid');
      const discordText = discord.sendMessage.mock.calls[0][0];
      expect(discordText).toContain('UserId: user-uuid');
      expect(discordText).not.toContain('User:');
    });

    it('mostra UserId como fallback quando busca no banco falha', async () => {
      userRepo.findOneBy.mockRejectedValue(new Error('DB error'));
      const sanitized = service.sanitize({
        errorType: 'FETCH_ERROR',
        message: 'Failed to fetch',
      });
      await service.capture(sanitized, 'user-uuid');
      const discordText = discord.sendMessage.mock.calls[0][0];
      expect(discordText).toContain('UserId: user-uuid');
    });

    it('inclui errorDetail (stack trace) na mensagem do Discord', async () => {
      const sanitized = service.sanitize({
        errorType: 'FETCH_ERROR',
        message: 'Failed to fetch',
        errorDetail: 'TypeError: Failed to fetch\n    at fetchWrapper (fetchWrapper.ts:143)',
      });
      await service.capture(sanitized);
      const discordText = discord.sendMessage.mock.calls[0][0];
      expect(discordText).toContain('Stack: TypeError: Failed to fetch');
      expect(discordText).toContain('at fetchWrapper');
    });

    it('trunca mensagem do Discord para caber no limite de 2000 chars', async () => {
      const sanitized = service.sanitize({
        errorType: 'FETCH_ERROR',
        message: 'x'.repeat(500),
        page: 'y'.repeat(500),
        origin: 'z'.repeat(200),
        errorDetail: 'e'.repeat(1000),
        request: { method: 'POST', url: 'u'.repeat(500) },
      });
      await service.capture(sanitized);
      const discordText = discord.sendMessage.mock.calls[0][0];
      expect(discordText.length).toBeLessThanOrEqual(2000);
      expect(discordText.endsWith('...')).toBe(true);
    });
  });
});
