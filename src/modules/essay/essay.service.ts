import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EssayRepository } from './essay.repository';
import { EssayThemeService } from './essay-theme.service';
import { CreateEssayDto } from './dtos/create-essay.dto';
import { SubmitEssayDto } from './dtos/submit-essay.dto';
import { Essay } from './entities/essay.entity';
import { EssayStatus } from './enums/essay-status.enum';
import { EssayInputType } from './enums/essay-input-type.enum';
import {
  AICorrectionResult,
  ESSAY_AI_PROVIDER,
  EssayAIProvider,
} from './ai/essay-ai.interface';
import { EnvService } from '../../shared/modules/env/env.service';

@Injectable()
export class EssayService {
  private readonly logger = new Logger(EssayService.name);

  constructor(
    private readonly essayRepo: EssayRepository,
    private readonly themeService: EssayThemeService,
    @Inject(ESSAY_AI_PROVIDER)
    private readonly aiProvider: EssayAIProvider,
    private readonly envService: EnvService,
  ) {}

  async create(dto: CreateEssayDto, userId: string): Promise<Essay> {
    await this.themeService.findById(dto.themeId);

    const existing = await this.essayRepo.findByUserAndTheme(
      userId,
      dto.themeId,
    );
    if (existing) {
      throw new ConflictException('Voce ja possui uma redacao para este tema');
    }

    return this.essayRepo.create({
      userId,
      themeId: dto.themeId,
      title: dto.title,
      text: dto.text,
      inputType: EssayInputType.TYPED,
      status: EssayStatus.DRAFT,
    } as Essay);
  }

  async updateDraft(
    essayId: string,
    dto: Partial<CreateEssayDto>,
    userId: string,
  ): Promise<void> {
    const essay = await this.essayRepo.findEssayById(essayId);
    if (!essay) throw new NotFoundException('Redacao nao encontrada');
    if (essay.userId !== userId) {
      throw new NotFoundException('Redacao nao encontrada');
    }
    if (essay.status !== EssayStatus.DRAFT) {
      throw new ConflictException('Redacao ja foi submetida');
    }
    if (dto.title !== undefined) essay.title = dto.title;
    if (dto.text !== undefined) essay.text = dto.text;
    await this.essayRepo.update(essay);
  }

  async submit(
    essayId: string,
    dto: SubmitEssayDto,
    userId: string,
  ): Promise<Essay> {
    const essay = await this.essayRepo.findEssayById(essayId);
    if (!essay) throw new NotFoundException('Redacao nao encontrada');
    if (essay.userId !== userId) {
      throw new NotFoundException('Redacao nao encontrada');
    }
    if (essay.status !== EssayStatus.DRAFT) {
      throw new ConflictException('Redacao ja foi submetida');
    }

    essay.title = dto.title;
    essay.text = dto.text;
    essay.wordCount = dto.text.split(/\s+/).filter(Boolean).length;
    essay.status = EssayStatus.SUBMITTED;
    essay.submittedAt = new Date();

    await this.essayRepo.update(essay);
    const saved = essay;

    // Fire-and-forget AI correction
    if (this.envService.get('ESSAY_AI_ENABLED')) {
      this.processAICorrection(saved.id).catch((err) =>
        this.logger.error(`AI correction failed for essay ${saved.id}`, err),
      );
    }

    return saved;
  }

  async findById(id: string, userId?: string): Promise<Essay> {
    const essay = await this.essayRepo.findEssayById(id);
    if (!essay) throw new NotFoundException('Redacao nao encontrada');
    if (userId && essay.userId !== userId) {
      throw new NotFoundException('Redacao nao encontrada');
    }
    return essay;
  }

  async findMyEssays(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: Essay[]; total: number }> {
    return this.essayRepo.findByUser(userId, page, limit);
  }

  private async processAICorrection(essayId: string): Promise<void> {
    const essay = await this.essayRepo.findEssayById(essayId);
    if (!essay || !essay.text) return;

    const theme = await this.themeService.findById(essay.themeId);
    const startTime = Date.now();

    try {
      const result: AICorrectionResult = await this.aiProvider.correctEssay(
        theme.title,
        theme.motivationalText,
        essay.text,
      );

      const comp = (n: number) =>
        result.competencias.find((c) => c.numero === n);

      const review = this.essayRepo.createAIReview({
        essayId,
        comp1Score: comp(1)?.nota ?? 0,
        comp1Feedback: comp(1)?.justificativa ?? '',
        comp1Suggestion: comp(1)?.sugestao ?? '',
        comp2Score: comp(2)?.nota ?? 0,
        comp2Feedback: comp(2)?.justificativa ?? '',
        comp2Suggestion: comp(2)?.sugestao ?? '',
        comp3Score: comp(3)?.nota ?? 0,
        comp3Feedback: comp(3)?.justificativa ?? '',
        comp3Suggestion: comp(3)?.sugestao ?? '',
        comp4Score: comp(4)?.nota ?? 0,
        comp4Feedback: comp(4)?.justificativa ?? '',
        comp4Suggestion: comp(4)?.sugestao ?? '',
        comp5Score: comp(5)?.nota ?? 0,
        comp5Feedback: comp(5)?.justificativa ?? '',
        comp5Suggestion: comp(5)?.sugestao ?? '',
        totalScore: result.notaTotal,
        generalComment: result.comentarioGeral,
        highlightedExcerpts: result.trechosDestacados,
        rawResponse: result,
        processingTimeMs: Date.now() - startTime,
        provider: this.envService.get('ESSAY_AI_PROVIDER'),
        model: this.envService.get('ESSAY_AI_MODEL'),
      });

      await this.essayRepo.saveAIReview(review);

      essay.status = EssayStatus.AI_REVIEWED;
      await this.essayRepo.update(essay);
    } catch (error) {
      this.logger.error(`AI correction error for essay ${essayId}`, error);
      essay.status = EssayStatus.AI_FAILED;
      await this.essayRepo.update(essay);
    }
  }
}
