import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { EssayRepository } from './essay.repository';
import { EssayThemeService } from './essay-theme.service';
import { CreateEssayDto } from './dtos/create-essay.dto';
import { SubmitEssayDto } from './dtos/submit-essay.dto';
import { CreateEssayReviewDto } from './dtos/create-essay-review.dto';
import { Essay } from './entities/essay.entity';
import { EssayReview } from './entities/essay-review.entity';
import { EssayStatus } from './enums/essay-status.enum';
import { ReviewType } from './enums/review-type.enum';
import { EssayInputType } from './enums/essay-input-type.enum';
import {
  AICorrectionResult,
  ESSAY_AI_PROVIDER,
  EssayAIProvider,
} from './ai/essay-ai.interface';
import { EnvService } from '../../shared/modules/env/env.service';
import { EssaySettingsService } from './essay-settings.service';
import { EmailService } from '../../shared/services/email/email.service';
import { BlobService } from '../../shared/services/blob/blob-service';

@Injectable()
export class EssayService {
  private readonly logger = new Logger(EssayService.name);

  constructor(
    private readonly essayRepo: EssayRepository,
    private readonly themeService: EssayThemeService,
    @Inject(ESSAY_AI_PROVIDER)
    private readonly aiProvider: EssayAIProvider,
    private readonly envService: EnvService,
    private readonly settingsService: EssaySettingsService,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly emailService: EmailService,
    @Inject('BlobService')
    private readonly blobService: BlobService,
  ) {}

  private async assertUserIsEnrolled(userId: string): Promise<void> {
    const [enrolled] = await this.entityManager.query(
      `SELECT id FROM student_course
       WHERE user_id = ? AND applicationStatus = ? LIMIT 1`,
      [userId, 'Matriculado'],
    );
    if (!enrolled) {
      throw new ForbiddenException(
        'Apenas alunos matriculados podem enviar redações',
      );
    }
  }

  async create(dto: CreateEssayDto, userId: string): Promise<Essay> {
    await this.assertUserIsEnrolled(userId);
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

    await this.assertUserIsEnrolled(userId);

    essay.title = dto.title;
    essay.text = dto.text;
    const plainText = dto.text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^>\s/gm, '')
      .replace(/^[-*+]\s/gm, '')
      .replace(/^\d+\.\s/gm, '');
    essay.wordCount = plainText.split(/\s+/).filter(Boolean).length;
    essay.status = EssayStatus.SUBMITTED;
    essay.submittedAt = new Date();

    await this.essayRepo.update(essay);
    const saved = essay;

    // Fire-and-forget AI correction (runtime toggle from DB)
    const aiEnabled = await this.settingsService.isAIEnabled();
    if (aiEnabled) {
      this.processAICorrection(saved.id).catch((err) =>
        this.logger.error(`AI correction failed for essay ${saved.id}`, err),
      );
    }

    return saved;
  }

  async submitImage(
    themeId: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<Essay> {
    await this.assertUserIsEnrolled(userId);

    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório');
    }

    // Validate theme is active and within period
    const theme = await this.themeService.findById(themeId);
    if (!theme.active) {
      throw new BadRequestException('Tema nao esta ativo');
    }
    const now = new Date();
    const weekStart = new Date(theme.weekStart);
    const weekEnd = new Date(theme.weekEnd);
    weekEnd.setHours(23, 59, 59, 999);
    if (now < weekStart || now > weekEnd) {
      throw new BadRequestException('Tema fora do periodo de submissao');
    }

    // Check uniqueness
    const existing = await this.essayRepo.findByUserAndTheme(userId, themeId);
    if (existing) {
      throw new ConflictException('Voce ja possui uma redacao para este tema');
    }

    // Validate file
    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato nao aceito. Envie JPG, PNG ou PDF.',
      );
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Arquivo deve ter no maximo 5MB');
    }

    // Upload to S3
    const imageKey = await this.blobService.uploadFile(
      file,
      this.envService.get('BUCKET_ESSAY'),
    );

    // Create essay
    return this.essayRepo.create({
      userId,
      themeId,
      inputType: EssayInputType.UPLOADED,
      status: EssayStatus.SUBMITTED,
      imageKey,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      submittedAt: new Date(),
    } as Essay);
  }

  async getImage(
    essayId: string,
    userId: string,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const essay = await this.essayRepo.findEssayById(essayId);
    if (!essay) throw new NotFoundException('Redacao nao encontrada');

    if (essay.inputType !== EssayInputType.UPLOADED || !essay.imageKey) {
      throw new BadRequestException('Redacao nao possui imagem');
    }

    // Check access: owner or reviewer
    if (essay.userId !== userId) {
      await this.validateReviewerScope(essayId, userId);
    }

    const file = await this.blobService.getFile(
      essay.imageKey,
      this.envService.get('BUCKET_ESSAY'),
    );

    return {
      buffer: Buffer.from(file.buffer, 'base64'),
      contentType: essay.mimeType || file.contentType,
      filename: essay.originalFilename || `redacao-${essayId}`,
    };
  }

  async findById(id: string, userId?: string): Promise<Essay> {
    const essay = await this.essayRepo.findEssayById(id);
    if (!essay) throw new NotFoundException('Redacao nao encontrada');
    if (userId && essay.userId !== userId) {
      throw new NotFoundException('Redacao nao encontrada');
    }
    return essay;
  }

  async findByIdForReviewer(id: string): Promise<Essay> {
    const essay = await this.essayRepo.findEssayById(id);
    if (!essay) throw new NotFoundException('Redacao nao encontrada');
    return essay;
  }

  async findMyEssays(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: Essay[]; total: number }> {
    return this.essayRepo.findByUser(userId, page, limit);
  }

  async getMyStats(userId: string) {
    const essays = await this.essayRepo.findUserEssaysForStats(userId);

    const timeline = essays.map((essay) => {
      const aiReviews = essay.reviews.filter((r) => r.reviewType === 'AI');
      const humanReviews = essay.reviews.filter(
        (r) => r.reviewType === 'HUMAN',
      );

      const pickReview = (reviews: typeof essay.reviews) => {
        if (reviews.length === 0) return null;
        const latest = reviews.reduce((a, b) =>
          new Date(a.createdAt) > new Date(b.createdAt) ? a : b,
        );
        return {
          totalScore: latest.totalScore,
          comp1Score: latest.comp1Score,
          comp2Score: latest.comp2Score,
          comp3Score: latest.comp3Score,
          comp4Score: latest.comp4Score,
          comp5Score: latest.comp5Score,
        };
      };

      return {
        essayId: essay.id,
        themeTitle: essay.theme?.title ?? '',
        submittedAt: essay.submittedAt,
        aiReview: pickReview(aiReviews),
        humanReview: pickReview(humanReviews),
      };
    });

    return { timeline };
  }

  async findAllEssays(
    page: number,
    limit: number,
    filters: { themeId?: string; status?: string; search?: string },
  ): Promise<{ data: Essay[]; total: number }> {
    return this.essayRepo.findAllEssays(page, limit, filters);
  }

  async findEssaysForCollaborator(
    userId: string,
    page: number,
    limit: number,
    filters: { themeId?: string; status?: string; search?: string },
  ): Promise<{ data: Essay[]; total: number }> {
    // Find the collaborator's prepCourse
    const [collaborator] = await this.entityManager.query(
      `SELECT c.partner_prep_course_id FROM collaborators c
       WHERE c.user_id = ? AND c.actived = 1 LIMIT 1`,
      [userId],
    );

    if (!collaborator) {
      return { data: [], total: 0 };
    }

    return this.essayRepo.findEssaysByPrepCourse(
      collaborator.partner_prep_course_id,
      page,
      limit,
      filters,
    );
  }

  async findEssaysByPrepCourse(
    prepCourseId: string,
    page: number,
    limit: number,
    filters: { themeId?: string; status?: string; search?: string },
  ): Promise<{ data: Essay[]; total: number }> {
    return this.essayRepo.findEssaysByPrepCourse(
      prepCourseId,
      page,
      limit,
      filters,
    );
  }

  async findReviewsByEssayId(essayId: string): Promise<EssayReview[]> {
    const essay = await this.essayRepo.findEssayById(essayId);
    if (!essay) throw new NotFoundException('Redacao nao encontrada');
    return this.essayRepo.findReviewsByEssayId(essayId);
  }

  async createHumanReview(
    essayId: string,
    reviewerId: string,
    dto: CreateEssayReviewDto,
  ): Promise<EssayReview> {
    const essay = await this.essayRepo.findEssayById(essayId);
    if (!essay) throw new NotFoundException('Redacao nao encontrada');

    if (
      essay.status !== EssayStatus.SUBMITTED &&
      essay.status !== EssayStatus.REVIEWED
    ) {
      throw new ConflictException(
        'Somente redacoes submetidas podem ser revisadas',
      );
    }

    const review = this.essayRepo.createReview({
      essay: { id: essayId } as Essay,
      reviewType: ReviewType.HUMAN,
      reviewerId,
      ...dto,
    });

    const saved = await this.essayRepo.saveReview(review);

    if (essay.status === EssayStatus.SUBMITTED) {
      await this.essayRepo.updateEssayStatus(essayId, EssayStatus.REVIEWED);
    }

    // Send email notification (fire-and-forget)
    const [reviewer] = await this.entityManager.query(
      'SELECT id, firstName, lastName, email FROM users WHERE id = ? LIMIT 1',
      [reviewerId],
    );
    const [student] = await this.entityManager.query(
      'SELECT id, firstName, lastName, email FROM users WHERE id = ? LIMIT 1',
      [essay.userId],
    );

    if (student && reviewer) {
      const frontendUrl = this.envService.get('FRONT_URL');
      this.emailService
        .sendEssayReviewEmail(student.email, {
          studentName: `${student.firstName} ${student.lastName}`,
          reviewerName: `${reviewer.firstName} ${reviewer.lastName}`,
          themeTitle: essay.theme?.title ?? '',
          totalScore: dto.totalScore,
          comp1Score: dto.comp1Score,
          comp2Score: dto.comp2Score,
          comp3Score: dto.comp3Score,
          comp4Score: dto.comp4Score,
          comp5Score: dto.comp5Score,
          reviewUrl: `${frontendUrl}/dashboard/redacao/${essayId}`,
        })
        .catch((err) =>
          this.logger.error('Failed to send review notification', err),
        );
    }

    return saved;
  }

  async validateReviewerScope(
    essayId: string,
    reviewerUserId: string,
  ): Promise<void> {
    // Check if reviewer is admin (role.base or role.name = 'admin')
    const [reviewerRole] = await this.entityManager.query(
      `SELECT r.base, r.name FROM users u
       INNER JOIN roles r ON u.roleId = r.id
       WHERE u.id = ?`,
      [reviewerUserId],
    );
    if (reviewerRole?.base || reviewerRole?.name === 'admin') return;

    const essay = await this.essayRepo.findEssayById(essayId);
    if (!essay) throw new NotFoundException('Redacao nao encontrada');

    // Find the student's prep course
    const [studentCourse] = await this.entityManager.query(
      `SELECT sc.partner_prep_course_id FROM student_course sc
       WHERE sc.user_id = ? LIMIT 1`,
      [essay.userId],
    );

    if (!studentCourse) {
      throw new ForbiddenException('Estudante nao vinculado a nenhum cursinho');
    }

    // Check if reviewer is a collaborator of that prep course
    const [collaborator] = await this.entityManager.query(
      `SELECT c.id FROM collaborators c
       WHERE c.user_id = ? AND c.partner_prep_course_id = ? AND c.actived = 1`,
      [reviewerUserId, studentCourse.partner_prep_course_id],
    );

    if (!collaborator) {
      throw new ForbiddenException(
        'Voce nao tem permissao para acessar redacoes deste cursinho',
      );
    }
  }

  async validatePrepCourseAccess(
    prepCourseId: string,
    userId: string,
  ): Promise<void> {
    // Check if user is admin (role.base or role.name = 'admin')
    const [userRole] = await this.entityManager.query(
      `SELECT r.base, r.name FROM users u
       INNER JOIN roles r ON u.roleId = r.id
       WHERE u.id = ?`,
      [userId],
    );
    if (userRole?.base || userRole?.name === 'admin') return;

    const [collaborator] = await this.entityManager.query(
      `SELECT c.id FROM collaborators c
       WHERE c.user_id = ? AND c.partner_prep_course_id = ? AND c.actived = 1`,
      [userId, prepCourseId],
    );

    if (!collaborator) {
      throw new ForbiddenException('Voce nao e colaborador deste cursinho');
    }
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

      const review = this.essayRepo.createReview({
        essay: { id: essayId } as Essay,
        reviewType: ReviewType.AI,
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

      await this.essayRepo.saveReview(review);

      await this.essayRepo.updateEssayStatus(essayId, EssayStatus.REVIEWED);
    } catch (error) {
      this.logger.error(`AI correction error for essay ${essayId}`, error);
      // Status stays SUBMITTED on failure
    }
  }
}
