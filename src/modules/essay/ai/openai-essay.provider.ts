import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { EnvService } from '../../../shared/modules/env/env.service';
import { AICorrectionResult, EssayAIProvider } from './essay-ai.interface';
import { buildEssayPrompt } from './essay-prompt';

@Injectable()
export class OpenAIEssayProvider implements EssayAIProvider {
  private readonly logger = new Logger(OpenAIEssayProvider.name);
  private client: OpenAI;

  constructor(private readonly envService: EnvService) {
    this.client = new OpenAI({
      apiKey: this.envService.get('OPENAI_API_KEY'),
    });
  }

  async correctEssay(
    themeTitle: string,
    motivationalText: string,
    essayText: string,
  ): Promise<AICorrectionResult> {
    const prompt = buildEssayPrompt(themeTitle, motivationalText, essayText);

    const response = await this.client.chat.completions.create({
      model: this.envService.get('ESSAY_AI_MODEL'),
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from OpenAI response');
    }

    const result: AICorrectionResult = JSON.parse(jsonMatch[0]);
    return result;
  }
}
