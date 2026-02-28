import { Module } from '@nestjs/common';
import { LokiLoggerService } from '../../logger/loki-logger';
import { DiscordWebhook } from '../../shared/services/webhooks/discord';
import { FrontendErrorsController } from './frontend-errors.controller';
import { FrontendErrorsService } from './frontend-errors.service';

@Module({
  controllers: [FrontendErrorsController],
  providers: [FrontendErrorsService, LokiLoggerService, DiscordWebhook],
})
export class FrontendErrorsModule {}
