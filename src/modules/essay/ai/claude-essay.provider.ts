import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { EnvService } from '../../../shared/modules/env/env.service';
import { AICorrectionResult, EssayAIProvider } from './essay-ai.interface';

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
    const prompt = this.buildPrompt(themeTitle, motivationalText, essayText);

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

  private buildPrompt(
    themeTitle: string,
    motivationalText: string,
    essayText: string,
  ): string {
    return `Voce e um corretor de redacoes do ENEM com vasta experiencia.
Avalie a redacao abaixo com base nas 5 competencias oficiais do ENEM.

## Tema
${themeTitle}

## Texto motivador
${motivationalText}

## Redacao do estudante
${essayText}

## Instrucoes de avaliacao

Para CADA uma das 5 competencias, forneca:
1. **Nota** (apenas: 0, 40, 80, 120, 160 ou 200)
2. **Justificativa** (2-3 frases explicando a nota)
3. **Sugestao de melhoria** (1-2 frases com orientacao pratica)

Alem das competencias, forneca:
4. **Comentario geral** sobre a redacao (pontos fortes e fracos)
5. **Trechos destacados** — cite ate 5 trechos especificos do texto com comentarios (positivos ou negativos)

Responda EXCLUSIVAMENTE no seguinte formato JSON:
{
  "competencias": [
    { "numero": 1, "nota": 160, "justificativa": "...", "sugestao": "..." },
    { "numero": 2, "nota": 120, "justificativa": "...", "sugestao": "..." },
    { "numero": 3, "nota": 160, "justificativa": "...", "sugestao": "..." },
    { "numero": 4, "nota": 80, "justificativa": "...", "sugestao": "..." },
    { "numero": 5, "nota": 120, "justificativa": "...", "sugestao": "..." }
  ],
  "comentarioGeral": "...",
  "trechosDestacados": [
    { "trecho": "texto exato do aluno", "tipo": "positivo", "comentario": "..." }
  ],
  "notaTotal": 640
}`;
  }
}
