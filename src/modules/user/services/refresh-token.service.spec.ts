import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenService } from './refresh-token.service';
import { CacheService } from 'src/shared/modules/cache/cache.service';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let cache: jest.Mocked<CacheService>;

  beforeEach(() => {
    cache = {
      wrap: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as any;

    service = new RefreshTokenService(cache);
  });

  describe('generateRefreshToken', () => {
    it('should generate a token, store it, and add to user list', async () => {
      cache.wrap.mockResolvedValue(null); // addTokenToUserList: no existing list

      const token = await service.generateRefreshToken('user-1');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      // Should store the token data
      expect(cache.set).toHaveBeenCalledWith(
        `refresh_token:${token}`,
        expect.stringContaining('"userId":"user-1"'),
        expect.any(Number),
      );
      // Should store the user token list
      expect(cache.set).toHaveBeenCalledWith(
        'user_refresh_tokens:user-1',
        expect.stringContaining(token),
        expect.any(Number),
      );
    });

    it('should append token to existing user list', async () => {
      cache.wrap.mockResolvedValue(JSON.stringify(['old-token']));

      const token = await service.generateRefreshToken('user-1');

      const listSetCall = (cache.set as jest.Mock).mock.calls.find(
        (c) => c[0] === 'user_refresh_tokens:user-1',
      );
      const storedTokens = JSON.parse(listSetCall[1]);
      expect(storedTokens).toContain('old-token');
      expect(storedTokens).toContain(token);
    });
  });

  describe('validateRefreshToken', () => {
    it('should return userId for a valid token', async () => {
      const tokenData = {
        userId: 'user-1',
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60,
      };
      cache.wrap.mockResolvedValue(JSON.stringify(tokenData));

      const userId = await service.validateRefreshToken('valid-token');
      expect(userId).toBe('user-1');
    });

    it('should throw UnauthorizedException for missing token', async () => {
      cache.wrap.mockResolvedValue(null);

      await expect(service.validateRefreshToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw and revoke an expired token', async () => {
      const tokenData = {
        userId: 'user-1',
        createdAt: Date.now() - 2000,
        expiresAt: Date.now() - 1000,
      };
      cache.wrap.mockResolvedValue(JSON.stringify(tokenData));

      await expect(
        service.validateRefreshToken('expired-token'),
      ).rejects.toThrow(UnauthorizedException);
      expect(cache.del).toHaveBeenCalledWith('refresh_token:expired-token');
    });
  });

  describe('revokeRefreshToken', () => {
    it('should delete the token from cache', async () => {
      await service.revokeRefreshToken('token-1');
      expect(cache.del).toHaveBeenCalledWith('refresh_token:token-1');
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens and remove user list', async () => {
      cache.wrap.mockResolvedValue(JSON.stringify(['t1', 't2']));

      await service.revokeAllUserTokens('user-1');

      expect(cache.del).toHaveBeenCalledWith('refresh_token:t1');
      expect(cache.del).toHaveBeenCalledWith('refresh_token:t2');
      expect(cache.del).toHaveBeenCalledWith('user_refresh_tokens:user-1');
    });

    it('should do nothing when user has no tokens', async () => {
      cache.wrap.mockResolvedValue(null);

      await service.revokeAllUserTokens('user-1');

      expect(cache.del).not.toHaveBeenCalled();
    });
  });

  describe('rotateRefreshToken', () => {
    it('should revoke old token and generate new one', async () => {
      cache.wrap.mockResolvedValue(null); // for addTokenToUserList

      const newToken = await service.rotateRefreshToken('old-token', 'user-1');

      expect(cache.del).toHaveBeenCalledWith('refresh_token:old-token');
      expect(newToken).toBeDefined();
      expect(typeof newToken).toBe('string');
    });
  });

  describe('getAccessTokenExpiration', () => {
    it('should return 900 seconds (15 minutes)', () => {
      expect(service.getAccessTokenExpiration()).toBe(900);
    });
  });
});
