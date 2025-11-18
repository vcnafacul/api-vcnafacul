import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CacheService } from 'src/shared/modules/cache/cache.service';

interface RefreshTokenData {
  userId: string;
  createdAt: number;
  expiresAt: number;
}

@Injectable()
export class RefreshTokenService {
  // Refresh token válido por 7 dias
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms

  // Access token válido por 15 minutos (em segundos)
  private readonly ACCESS_TOKEN_EXPIRATION = 15 * 60; // 900 segundos

  constructor(private readonly cache: CacheService) {}

  /**
   * Gera um novo refresh token e armazena no Redis
   */
  async generateRefreshToken(userId: string): Promise<string> {
    const tokenId = randomUUID();
    const now = Date.now();

    const tokenData: RefreshTokenData = {
      userId,
      createdAt: now,
      expiresAt: now + this.REFRESH_TOKEN_TTL,
    };

    // Armazena o token no Redis com TTL de 7 dias
    const key = this.getTokenKey(tokenId);
    await this.cache.set(
      key,
      JSON.stringify(tokenData),
      this.REFRESH_TOKEN_TTL,
    );

    // Adiciona o token à lista de tokens do usuário (para revogação em massa)
    await this.addTokenToUserList(userId, tokenId);

    return tokenId;
  }

  /**
   * Valida um refresh token e retorna o userId
   */
  async validateRefreshToken(token: string): Promise<string> {
    const key = this.getTokenKey(token);
    const data = await this.cache.wrap<string>(key, async () => null);

    if (!data) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const tokenData: RefreshTokenData = JSON.parse(data);

    // Verifica se o token está expirado
    if (Date.now() > tokenData.expiresAt) {
      await this.revokeRefreshToken(token);
      throw new UnauthorizedException('Refresh token expirado');
    }

    return tokenData.userId;
  }

  /**
   * Revoga um refresh token específico
   */
  async revokeRefreshToken(token: string): Promise<void> {
    const key = this.getTokenKey(token);
    await this.cache.del(key);
  }

  /**
   * Revoga todos os refresh tokens de um usuário (logout de todos dispositivos)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    const userTokensKey = this.getUserTokensKey(userId);
    const tokensData = await this.cache.wrap<string>(
      userTokensKey,
      async () => null,
    );

    if (!tokensData) {
      return;
    }

    const tokens: string[] = JSON.parse(tokensData);

    // Remove cada token individualmente
    await Promise.all(tokens.map((token) => this.revokeRefreshToken(token)));

    // Remove a lista de tokens do usuário
    await this.cache.del(userTokensKey);
  }

  /**
   * Rotaciona o refresh token (revoga o antigo e gera um novo)
   * Aumenta a segurança detectando reutilização de tokens
   */
  async rotateRefreshToken(oldToken: string, userId: string): Promise<string> {
    // Revoga o token antigo
    await this.revokeRefreshToken(oldToken);

    // Gera um novo token
    return this.generateRefreshToken(userId);
  }

  /**
   * Retorna o tempo de expiração do access token em segundos
   */
  getAccessTokenExpiration(): number {
    return this.ACCESS_TOKEN_EXPIRATION;
  }

  /**
   * Adiciona um token à lista de tokens do usuário
   */
  private async addTokenToUserList(
    userId: string,
    tokenId: string,
  ): Promise<void> {
    const userTokensKey = this.getUserTokensKey(userId);
    const tokensData = await this.cache.wrap<string>(
      userTokensKey,
      async () => null,
    );

    let tokens: string[] = [];
    if (tokensData) {
      tokens = JSON.parse(tokensData);
    }

    tokens.push(tokenId);

    // Armazena a lista com o mesmo TTL do refresh token
    await this.cache.set(
      userTokensKey,
      JSON.stringify(tokens),
      this.REFRESH_TOKEN_TTL,
    );
  }

  /**
   * Gera a chave do Redis para um token específico
   */
  private getTokenKey(token: string): string {
    return `refresh_token:${token}`;
  }

  /**
   * Gera a chave do Redis para a lista de tokens de um usuário
   */
  private getUserTokensKey(userId: string): string {
    return `user_refresh_tokens:${userId}`;
  }
}
