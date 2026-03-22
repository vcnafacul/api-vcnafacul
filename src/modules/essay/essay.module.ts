import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvModule } from '../../shared/modules/env/env.module';
import { UserModule } from '../user/user.module';
import { EssayTheme } from './entities/essay-theme.entity';
import { Essay } from './entities/essay.entity';
import { EssayAIReview } from './entities/essay-ai-review.entity';
import { EssayThemeRepository } from './essay-theme.repository';
import { EssayRepository } from './essay.repository';
import { EssayThemeService } from './essay-theme.service';
import { EssayService } from './essay.service';
import { EssayController } from './essay.controller';
import { ClaudeEssayProvider } from './ai/claude-essay.provider';
import { NoopEssayProvider } from './ai/noop-essay.provider';
import { ESSAY_AI_PROVIDER } from './ai/essay-ai.interface';
import { EnvService } from '../../shared/modules/env/env.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EssayTheme, Essay, EssayAIReview]),
    EnvModule,
    UserModule,
  ],
  controllers: [EssayController],
  providers: [
    EssayThemeRepository,
    EssayRepository,
    EssayThemeService,
    EssayService,
    ClaudeEssayProvider,
    NoopEssayProvider,
    {
      provide: ESSAY_AI_PROVIDER,
      useFactory: (
        env: EnvService,
        claude: ClaudeEssayProvider,
        noop: NoopEssayProvider,
      ) => {
        return env.get('ESSAY_AI_ENABLED') && env.get('ANTHROPIC_API_KEY')
          ? claude
          : noop;
      },
      inject: [EnvService, ClaudeEssayProvider, NoopEssayProvider],
    },
  ],
})
export class EssayModule {}
