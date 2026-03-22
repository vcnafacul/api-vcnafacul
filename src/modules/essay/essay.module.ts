import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvModule } from '../../shared/modules/env/env.module';
import { UserModule } from '../user/user.module';
import { EssayTheme } from './entities/essay-theme.entity';
import { Essay } from './entities/essay.entity';
import { EssayAIReview } from './entities/essay-ai-review.entity';
import { EssaySettings } from './entities/essay-settings.entity';
import { EssayThemeRepository } from './essay-theme.repository';
import { EssayRepository } from './essay.repository';
import { EssaySettingsRepository } from './essay-settings.repository';
import { EssayThemeService } from './essay-theme.service';
import { EssayService } from './essay.service';
import { EssaySettingsService } from './essay-settings.service';
import { EssayController } from './essay.controller';
import { ClaudeEssayProvider } from './ai/claude-essay.provider';
import { NoopEssayProvider } from './ai/noop-essay.provider';
import { OpenAIEssayProvider } from './ai/openai-essay.provider';
import { ESSAY_AI_PROVIDER } from './ai/essay-ai.interface';
import { EnvService } from '../../shared/modules/env/env.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EssayTheme, Essay, EssayAIReview, EssaySettings]),
    EnvModule,
    UserModule,
  ],
  controllers: [EssayController],
  providers: [
    EssayThemeRepository,
    EssayRepository,
    EssaySettingsRepository,
    EssayThemeService,
    EssayService,
    EssaySettingsService,
    ClaudeEssayProvider,
    NoopEssayProvider,
    OpenAIEssayProvider,
    {
      provide: ESSAY_AI_PROVIDER,
      useFactory: (
        env: EnvService,
        claude: ClaudeEssayProvider,
        openai: OpenAIEssayProvider,
        noop: NoopEssayProvider,
      ) => {
        const provider = env.get('ESSAY_AI_PROVIDER');
        if (provider === 'openai' && env.get('OPENAI_API_KEY')) return openai;
        if (provider === 'claude' && env.get('ANTHROPIC_API_KEY')) return claude;
        return noop;
      },
      inject: [
        EnvService,
        ClaudeEssayProvider,
        OpenAIEssayProvider,
        NoopEssayProvider,
      ],
    },
  ],
})
export class EssayModule {}
