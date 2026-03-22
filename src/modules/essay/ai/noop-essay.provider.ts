import { Injectable, Logger } from '@nestjs/common';
import { AICorrectionResult, EssayAIProvider } from './essay-ai.interface';

@Injectable()
export class NoopEssayProvider implements EssayAIProvider {
  private readonly logger = new Logger(NoopEssayProvider.name);

  async correctEssay(): Promise<AICorrectionResult> {
    this.logger.warn('AI correction is disabled — returning empty result');
    throw new Error('AI correction is disabled');
  }
}
