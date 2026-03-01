import { Injectable } from '@nestjs/common';
import { LokiLoggerService } from '../../logger/loki-logger';
import { DiscordWebhook } from '../../shared/services/webhooks/discord';
import { UserRepository } from '../user/user.repository';
import {
  FrontendErrorBodyDto,
  SanitizedFrontendErrorDto,
} from './dto/frontend-error.dto';

const MAX_MESSAGE_LENGTH = 500;
const MAX_ERROR_DETAIL_LENGTH = 1000;
const MAX_ORIGIN_LENGTH = 200;
const MAX_PAGE_LENGTH = 500;
const MAX_URL_LENGTH = 1000;
const MAX_DISCORD_LENGTH = 2000;

@Injectable()
export class FrontendErrorsService {
  constructor(
    private readonly logger: LokiLoggerService,
    private readonly discord: DiscordWebhook,
    private readonly userRepo: UserRepository,
  ) {}

  /**
   * Whitelist: só estes campos são aceitos. Nunca logar token, senha ou dados sensíveis.
   */
  sanitize(body: FrontendErrorBodyDto, ip?: string): SanitizedFrontendErrorDto {
    const safe: SanitizedFrontendErrorDto = {
      source: 'frontend',
      errorType: this.slice(body.errorType, 100),
      message: this.slice(body.message, MAX_MESSAGE_LENGTH),
      page: this.slice(body.page, MAX_PAGE_LENGTH),
      origin: this.slice(body.origin, MAX_ORIGIN_LENGTH),
      request:
        body.request && typeof body.request === 'object'
          ? {
              method: this.slice(body.request.method, 10),
              url: this.slice(body.request.url, MAX_URL_LENGTH),
            }
          : undefined,
      metadata:
        body.metadata && typeof body.metadata === 'object'
          ? {
              userAgent: this.slice(body.metadata.userAgent, 300),
              online:
                typeof body.metadata.online === 'boolean'
                  ? body.metadata.online
                  : undefined,
              release: this.slice(body.metadata.release, 50),
            }
          : undefined,
      errorDetail: this.slice(body.errorDetail, MAX_ERROR_DETAIL_LENGTH),
      ip,
      severity: this.computeSeverity(body),
    };
    return safe;
  }

  private slice(value: unknown, maxLen: number): string | undefined {
    if (value == null) return undefined;
    const s = String(value);
    return s.length > maxLen ? s.slice(0, maxLen) : s;
  }

  /**
   * Erros considerados "graves": falha de rede no cliente (back nunca soube).
   * Esses são enviados ao Discord além do Grafana.
   */
  private computeSeverity(body: FrontendErrorBodyDto): 'normal' | 'severe' {
    const msg = (body.message ?? '').toLowerCase();
    const type = (body.errorType ?? '').toUpperCase();
    if (type === 'FETCH_ERROR') return 'severe';
    if (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('load failed') ||
      msg.includes('networkerror')
    ) {
      return 'severe';
    }
    return 'normal';
  }

  async capture(
    sanitized: SanitizedFrontendErrorDto,
    userIdFromJwt?: string,
  ): Promise<void> {
    const userId = userIdFromJwt ?? sanitized.userId;
    const logPayload = { ...sanitized, userId };

    this.logger.error({
      source: 'frontend',
      ...logPayload,
    });

    if (sanitized.severity === 'severe') {
      let userEmail: string | undefined;
      if (userId) {
        try {
          const user = await this.userRepo.findOneBy({ id: userId });
          userEmail = user?.email;
        } catch {
          // fallback: show UUID instead
        }
      }
      const discordText = this.formatForDiscord(logPayload, userEmail);
      await this.discord.sendMessage(discordText);
    }
  }

  private formatForDiscord(
    payload: SanitizedFrontendErrorDto & { userId?: string },
    userEmail?: string,
  ): string {
    const parts: string[] = [
      '[Frontend Error]',
      `Type: ${payload.errorType ?? '—'}`,
      `Message: ${payload.message ?? '—'}`,
      `Page: ${payload.page ?? '—'}`,
      `Origin: ${payload.origin ?? '—'}`,
    ];
    if (payload.request) {
      parts.push(`Request: ${payload.request.method ?? '?'} ${payload.request.url ?? '—'}`);
    }
    if (userEmail) {
      parts.push(`User: ${userEmail}`);
    } else if (payload.userId) {
      parts.push(`UserId: ${payload.userId}`);
    }
    if (payload.metadata?.release) parts.push(`Release: ${payload.metadata.release}`);
    if (payload.errorDetail) parts.push(`Stack: ${payload.errorDetail}`);

    const message = parts.join('\n');
    if (message.length > MAX_DISCORD_LENGTH) {
      return message.slice(0, MAX_DISCORD_LENGTH - 3) + '...';
    }
    return message;
  }
}
