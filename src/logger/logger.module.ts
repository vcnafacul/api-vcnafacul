import { Module } from '@nestjs/common';
import { LokiLoggerService } from './loki-logger';

@Module({
  providers: [LokiLoggerService],
  exports: [LokiLoggerService],
})
export class LoggerModule {}
