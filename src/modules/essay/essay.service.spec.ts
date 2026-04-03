import { ConflictException, NotFoundException } from '@nestjs/common';
import { EssayService } from './essay.service';
import { EssayStatus } from './enums/essay-status.enum';
import { EssayInputType } from './enums/essay-input-type.enum';

describe('EssayService', () => {
  let service: EssayService;
  let essayRepo: any;
  let themeService: any;
  let aiProvider: any;
  let envService: any;
  let settingsService: any;
  let entityManager: any;
  let emailService: any;
  let blobService: any;
  let mockCacheService: any;

  const mockTheme = { id: 'theme-1', title: 'Tema', motivationalText: 'Texto' };
  const mockEssay = {
    id: 'essay-1',
    userId: 'user-1',
    themeId: 'theme-1',
    title: 'Titulo',
    text: 'Texto da redacao',
    status: EssayStatus.DRAFT,
    inputType: EssayInputType.TYPED,
  };

  beforeEach(() => {
    essayRepo = {
      findByUserAndTheme: jest.fn(),
      create: jest.fn(),
      findEssayById: jest.fn(),
      update: jest.fn(),
      findByUser: jest.fn(),
      createReview: jest.fn(),
      saveReview: jest.fn(),
      findUserEssaysForStats: jest.fn(),
      findAllEssays: jest.fn(),
      findEssaysByPrepCourse: jest.fn(),
      updateEssayStatus: jest.fn(),
      findReviewsByEssayId: jest.fn(),
    };
    themeService = {
      findById: jest.fn().mockResolvedValue(mockTheme),
    };
    aiProvider = {
      correctEssay: jest.fn(),
    };
    envService = {
      get: jest.fn().mockReturnValue(false),
    };
    settingsService = {
      isAIEnabled: jest.fn().mockResolvedValue(false),
      getSettings: jest.fn().mockResolvedValue({ aiEnabled: false }),
      updateSettings: jest.fn(),
    };
    entityManager = {
      findOne: jest.fn(),
      query: jest.fn().mockResolvedValue([{ id: 'sc-1' }]),
    };
    emailService = {
      sendEssayReviewEmail: jest.fn().mockResolvedValue(undefined),
    };
    blobService = {
      uploadFile: jest.fn(),
      getFile: jest.fn(),
      deleteFile: jest.fn(),
    };
    mockCacheService = {
      wrap: jest.fn().mockImplementation((_key, fn) => fn()),
      del: jest.fn().mockResolvedValue(undefined),
    };

    service = new EssayService(
      essayRepo,
      themeService,
      aiProvider,
      envService,
      settingsService,
      entityManager,
      emailService,
      blobService,
      mockCacheService,
    );
  });

  describe('create', () => {
    it('should create an essay', async () => {
      essayRepo.findByUserAndTheme.mockResolvedValue(null);
      essayRepo.create.mockResolvedValue(mockEssay);

      const result = await service.create(
        { themeId: 'theme-1', title: 'Titulo', text: 'Texto' },
        'user-1',
      );

      expect(themeService.findById).toHaveBeenCalledWith('theme-1');
      expect(essayRepo.findByUserAndTheme).toHaveBeenCalledWith(
        'user-1',
        'theme-1',
      );
      expect(result).toEqual(mockEssay);
    });

    it('should throw ConflictException if essay already exists for theme', async () => {
      essayRepo.findByUserAndTheme.mockResolvedValue(mockEssay);

      await expect(
        service.create({ themeId: 'theme-1', title: 'T', text: 'X' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateDraft', () => {
    it('should update a draft essay', async () => {
      essayRepo.findEssayById.mockResolvedValue({ ...mockEssay });
      essayRepo.update.mockResolvedValue(undefined);

      await service.updateDraft('essay-1', { title: 'Novo titulo' }, 'user-1');

      expect(essayRepo.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if essay not found', async () => {
      essayRepo.findEssayById.mockResolvedValue(null);

      await expect(
        service.updateDraft('essay-1', { title: 'X' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user does not own the essay', async () => {
      essayRepo.findEssayById.mockResolvedValue({
        ...mockEssay,
        userId: 'other',
      });

      await expect(
        service.updateDraft('essay-1', { title: 'X' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if essay is already submitted', async () => {
      essayRepo.findEssayById.mockResolvedValue({
        ...mockEssay,
        status: EssayStatus.SUBMITTED,
      });

      await expect(
        service.updateDraft('essay-1', { title: 'X' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('submit', () => {
    it('should submit a draft essay', async () => {
      const essay = { ...mockEssay };
      essayRepo.findEssayById.mockResolvedValue(essay);
      essayRepo.update.mockResolvedValue(undefined);

      const result = await service.submit(
        'essay-1',
        { title: 'Titulo Final', text: 'Texto final da redacao' },
        'user-1',
      );

      expect(result.status).toBe(EssayStatus.SUBMITTED);
      expect(result.wordCount).toBe(4);
      expect(result.submittedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if essay not found', async () => {
      essayRepo.findEssayById.mockResolvedValue(null);

      await expect(
        service.submit('essay-1', { title: 'T', text: 'X' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if already submitted', async () => {
      essayRepo.findEssayById.mockResolvedValue({
        ...mockEssay,
        status: EssayStatus.SUBMITTED,
      });

      await expect(
        service.submit('essay-1', { title: 'T', text: 'X' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return the essay', async () => {
      essayRepo.findEssayById.mockResolvedValue(mockEssay);

      const result = await service.findById('essay-1');
      expect(result).toEqual(mockEssay);
    });

    it('should throw NotFoundException if not found', async () => {
      essayRepo.findEssayById.mockResolvedValue(null);

      await expect(service.findById('essay-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if userId does not match', async () => {
      essayRepo.findEssayById.mockResolvedValue({
        ...mockEssay,
        userId: 'other',
      });

      await expect(service.findById('essay-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findMyEssays', () => {
    it('should delegate to repository', async () => {
      const expected = { data: [mockEssay], total: 1 };
      essayRepo.findByUser.mockResolvedValue(expected);

      const result = await service.findMyEssays('user-1', 1, 10);
      expect(result).toEqual(expected);
      expect(essayRepo.findByUser).toHaveBeenCalledWith('user-1', 1, 10);
    });
  });

  describe('getMyStats', () => {
    it('should return timeline with AI and human reviews', async () => {
      const mockEssays = [
        {
          id: 'essay-1',
          submittedAt: new Date('2026-01-15'),
          theme: { title: 'Tema 1' },
          reviews: [
            {
              id: 'r1',
              reviewType: 'AI',
              totalScore: 600,
              comp1Score: 120,
              comp2Score: 120,
              comp3Score: 120,
              comp4Score: 120,
              comp5Score: 120,
              createdAt: new Date('2026-01-15'),
            },
            {
              id: 'r2',
              reviewType: 'HUMAN',
              totalScore: 700,
              comp1Score: 140,
              comp2Score: 140,
              comp3Score: 140,
              comp4Score: 140,
              comp5Score: 140,
              createdAt: new Date('2026-01-16'),
            },
          ],
        },
        {
          id: 'essay-2',
          submittedAt: new Date('2026-02-10'),
          theme: { title: 'Tema 2' },
          reviews: [
            {
              id: 'r3',
              reviewType: 'AI',
              totalScore: 720,
              comp1Score: 160,
              comp2Score: 140,
              comp3Score: 140,
              comp4Score: 140,
              comp5Score: 140,
              createdAt: new Date('2026-02-10'),
            },
          ],
        },
      ];

      jest
        .spyOn(essayRepo, 'findUserEssaysForStats')
        .mockResolvedValue(mockEssays as any);

      const result = await service.getMyStats('user-1');

      expect(result.timeline).toHaveLength(2);
      expect(result.timeline[0].themeTitle).toBe('Tema 1');
      expect(result.timeline[0].aiReview?.totalScore).toBe(600);
      expect(result.timeline[0].humanReview?.totalScore).toBe(700);
      expect(result.timeline[1].humanReview).toBeNull();
    });

    it('should pick the most recent human review when multiple exist', async () => {
      const mockEssays = [
        {
          id: 'essay-1',
          submittedAt: new Date('2026-01-15'),
          theme: { title: 'Tema 1' },
          reviews: [
            {
              id: 'r1',
              reviewType: 'HUMAN',
              totalScore: 500,
              comp1Score: 100,
              comp2Score: 100,
              comp3Score: 100,
              comp4Score: 100,
              comp5Score: 100,
              createdAt: new Date('2026-01-16'),
            },
            {
              id: 'r2',
              reviewType: 'HUMAN',
              totalScore: 700,
              comp1Score: 140,
              comp2Score: 140,
              comp3Score: 140,
              comp4Score: 140,
              comp5Score: 140,
              createdAt: new Date('2026-01-20'),
            },
          ],
        },
      ];

      jest
        .spyOn(essayRepo, 'findUserEssaysForStats')
        .mockResolvedValue(mockEssays as any);

      const result = await service.getMyStats('user-1');

      expect(result.timeline[0].humanReview?.totalScore).toBe(700);
    });

    it('should handle essays with no reviews', async () => {
      const mockEssays = [
        {
          id: 'essay-1',
          submittedAt: new Date('2026-01-15'),
          theme: { title: 'Tema 1' },
          reviews: [],
        },
      ];

      jest
        .spyOn(essayRepo, 'findUserEssaysForStats')
        .mockResolvedValue(mockEssays as any);

      const result = await service.getMyStats('user-1');

      expect(result.timeline[0].aiReview).toBeNull();
      expect(result.timeline[0].humanReview).toBeNull();
    });

    it('should handle null theme gracefully', async () => {
      const mockEssays = [
        {
          id: 'essay-1',
          submittedAt: new Date('2026-01-15'),
          theme: null,
          reviews: [],
        },
      ];

      jest
        .spyOn(essayRepo, 'findUserEssaysForStats')
        .mockResolvedValue(mockEssays as any);

      const result = await service.getMyStats('user-1');

      expect(result.timeline[0].themeTitle).toBe('');
    });
  });

  describe('findByIdForReviewer', () => {
    it('should return essay without user check', async () => {
      essayRepo.findEssayById.mockResolvedValue(mockEssay);
      const result = await service.findByIdForReviewer('essay-1');
      expect(result).toEqual(mockEssay);
    });

    it('should throw NotFoundException if not found', async () => {
      essayRepo.findEssayById.mockResolvedValue(null);
      await expect(service.findByIdForReviewer('essay-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllEssays', () => {
    it('should delegate to repository with filters', async () => {
      const expected = { data: [], total: 0 };
      essayRepo.findAllEssays.mockResolvedValue(expected);
      const filters = { themeId: 't1', status: 'SUBMITTED', search: 'query' };
      const result = await service.findAllEssays(1, 20, filters);
      expect(result).toEqual(expected);
      expect(essayRepo.findAllEssays).toHaveBeenCalledWith(1, 20, filters);
    });
  });

  describe('findEssaysForCollaborator', () => {
    it('should return empty when no collaborator found', async () => {
      entityManager.query.mockResolvedValue([]);
      const result = await service.findEssaysForCollaborator(
        'user-1',
        1,
        10,
        {},
      );
      expect(result).toEqual({ data: [], total: 0 });
    });

    it('should delegate to findEssaysByPrepCourse when collaborator found', async () => {
      entityManager.query.mockResolvedValue([
        { partner_prep_course_id: 'pc-1' },
      ]);
      essayRepo.findEssaysByPrepCourse.mockResolvedValue({
        data: [],
        total: 0,
      });
      await service.findEssaysForCollaborator('user-1', 1, 10, {});
      expect(essayRepo.findEssaysByPrepCourse).toHaveBeenCalledWith(
        'pc-1',
        1,
        10,
        {},
      );
    });
  });

  describe('findEssaysByPrepCourse', () => {
    it('should delegate to repository', async () => {
      const expected = { data: [], total: 0 };
      essayRepo.findEssaysByPrepCourse.mockResolvedValue(expected);
      const result = await service.findEssaysByPrepCourse('pc-1', 1, 10, {});
      expect(result).toEqual(expected);
    });
  });

  describe('findReviewsByEssayId', () => {
    it('should return reviews', async () => {
      essayRepo.findEssayById.mockResolvedValue(mockEssay);
      essayRepo.findReviewsByEssayId.mockResolvedValue([]);
      const result = await service.findReviewsByEssayId('essay-1');
      expect(result).toEqual([]);
    });

    it('should throw NotFoundException if essay not found', async () => {
      essayRepo.findEssayById.mockResolvedValue(null);
      await expect(service.findReviewsByEssayId('essay-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createHumanReview', () => {
    const reviewDto = {
      totalScore: 800,
      comp1Score: 160,
      comp2Score: 160,
      comp3Score: 160,
      comp4Score: 160,
      comp5Score: 160,
      generalComment: 'Boa redacao',
    };

    it('should create a human review for submitted essay', async () => {
      const essay = {
        ...mockEssay,
        status: EssayStatus.SUBMITTED,
        theme: { title: 'Tema' },
      };
      essayRepo.findEssayById.mockResolvedValue(essay);
      essayRepo.createReview.mockReturnValue({ id: 'r1' });
      essayRepo.saveReview.mockResolvedValue({ id: 'r1' });
      entityManager.query.mockResolvedValue([
        { id: 'u1', firstName: 'Rev', lastName: 'One', email: 'r@t.com' },
      ]);

      const result = await service.createHumanReview(
        'essay-1',
        'reviewer-1',
        reviewDto as any,
      );
      expect(result).toEqual({ id: 'r1' });
      expect(essayRepo.updateEssayStatus).toHaveBeenCalledWith(
        'essay-1',
        EssayStatus.REVIEWED,
      );
    });

    it('should not update status if already reviewed', async () => {
      const essay = {
        ...mockEssay,
        status: EssayStatus.REVIEWED,
        theme: { title: 'Tema' },
      };
      essayRepo.findEssayById.mockResolvedValue(essay);
      essayRepo.createReview.mockReturnValue({ id: 'r1' });
      essayRepo.saveReview.mockResolvedValue({ id: 'r1' });
      entityManager.query.mockResolvedValue([]);

      await service.createHumanReview(
        'essay-1',
        'reviewer-1',
        reviewDto as any,
      );
      expect(essayRepo.updateEssayStatus).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if essay not found', async () => {
      essayRepo.findEssayById.mockResolvedValue(null);
      await expect(
        service.createHumanReview('essay-1', 'reviewer-1', reviewDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if essay is draft', async () => {
      essayRepo.findEssayById.mockResolvedValue({ ...mockEssay });
      await expect(
        service.createHumanReview('essay-1', 'reviewer-1', reviewDto as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validateReviewerScope', () => {
    it('should pass for admin user', async () => {
      entityManager.query.mockResolvedValue([{ base: true, name: 'admin' }]);
      await expect(
        service.validateReviewerScope('essay-1', 'admin-user'),
      ).resolves.toBeUndefined();
    });

    it('should pass for collaborator of same prep course', async () => {
      entityManager.query
        .mockResolvedValueOnce([{ base: false, name: 'role' }])
        .mockResolvedValueOnce([{ partner_prep_course_id: 'pc-1' }])
        .mockResolvedValueOnce([{ id: 'c1' }]);
      essayRepo.findEssayById.mockResolvedValue(mockEssay);

      await expect(
        service.validateReviewerScope('essay-1', 'reviewer-1'),
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException when student has no prep course', async () => {
      entityManager.query
        .mockResolvedValueOnce([{ base: false, name: 'role' }])
        .mockResolvedValueOnce([]);
      essayRepo.findEssayById.mockResolvedValue(mockEssay);

      await expect(
        service.validateReviewerScope('essay-1', 'reviewer-1'),
      ).rejects.toThrow('Estudante nao vinculado a nenhum cursinho');
    });

    it('should throw ForbiddenException when reviewer is not collaborator', async () => {
      entityManager.query
        .mockResolvedValueOnce([{ base: false, name: 'role' }])
        .mockResolvedValueOnce([{ partner_prep_course_id: 'pc-1' }])
        .mockResolvedValueOnce([]);
      essayRepo.findEssayById.mockResolvedValue(mockEssay);

      await expect(
        service.validateReviewerScope('essay-1', 'reviewer-1'),
      ).rejects.toThrow(
        'Voce nao tem permissao para acessar redacoes deste cursinho',
      );
    });
  });

  describe('validatePrepCourseAccess', () => {
    it('should pass for admin user', async () => {
      entityManager.query.mockResolvedValue([{ base: true, name: 'admin' }]);
      await expect(
        service.validatePrepCourseAccess('pc-1', 'admin-user'),
      ).resolves.toBeUndefined();
    });

    it('should pass for collaborator', async () => {
      entityManager.query
        .mockResolvedValueOnce([{ base: false, name: 'role' }])
        .mockResolvedValueOnce([{ id: 'c1' }]);

      await expect(
        service.validatePrepCourseAccess('pc-1', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException when not collaborator', async () => {
      entityManager.query
        .mockResolvedValueOnce([{ base: false, name: 'role' }])
        .mockResolvedValueOnce([]);

      await expect(
        service.validatePrepCourseAccess('pc-1', 'user-1'),
      ).rejects.toThrow('Voce nao e colaborador deste cursinho');
    });
  });
});
