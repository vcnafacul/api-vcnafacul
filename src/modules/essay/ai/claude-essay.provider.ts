import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { EnvService } from '../../../shared/modules/env/env.service';
import { AICorrectionResult, EssayAIProvider } from './essay-ai.interface';
import { buildEssayPrompt } from './essay-prompt';

@Injectable()
export class ClaudeEssayProvider implements EssayAIProvider {
  private readonly logger = new Logger(ClaudeEssayProvider.name);
  private client: Anthropic;

  constructor(private readonly envService: EnvService) {
    this.client = new Anthropic({
      apiKey: this.envService.get('ANTHROPIC_API_KEY'),
    });
  }

  async correctEssay(
    themeTitle: string,
    motivationalText: string,
    essayText: string,
  ): Promise<AICorrectionResult> {
    const prompt = buildEssayPrompt(themeTitle, motivationalText, essayText);

    const response = await this.client.messages.create({
      model: this.envService.get('ESSAY_AI_MODEL'),
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected AI response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from AI response');
    }

    const result: AICorrectionResult = JSON.parse(jsonMatch[0]);
    return result;
  }
}
