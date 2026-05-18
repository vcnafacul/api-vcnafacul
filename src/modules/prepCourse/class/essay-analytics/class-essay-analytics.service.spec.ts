import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StatusApplication } from '../../studentCourse/enums/stastusApplication';
import { ClassService } from '../class.service';
import { ClassEssayAnalyticsRepository } from './class-essay-analytics.repository';
import { ClassEssayAnalyticsService } from './class-essay-analytics.service';
import { ClassEssaySnapshot } from './class-essay-snapshot.entity';

const ACTIVE_START = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
const ACTIVE_END = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
const PAST_END = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago (ended)

function makeClass(overrides: Partial<any> = {}): any {
  return {
    id: 'class-1',
    name: 'Turma A',
    coursePeriodStartDate: ACTIVE_START,
    coursePeriodEndDate: ACTIVE_END,
    students: [
      {
        id: 'sc-1',
        userId: 'user-1',
        status: StatusApplication.Enrolled,
      },
      {
        id: 'sc-2',
        userId: 'user-2',
        status: StatusApplication.UnderReview,
      },
    ],
    ...overrides,
  };
}

function makeSnap(
  overrides: Partial<ClassEssaySnapshot> = {},
): ClassEssaySnapshot {
  return {
    id: 'snap-1',
    classId: 'class-1',
    month: '2026-05',
    monthStart: new Date('2026-05-01T00:00:00.000Z'),
    monthEnd: new Date('2026-05-31T23:59:59.000Z'),
    userIds: ['user-1'],
    payload: {
      geral: 650,
      competencias: { c1: 130, c2: 130, c3: 130, c4: 130, c5: 130 },
      studentsWithAtLeastOneHumanReview: 1,
      essaysReviewedByHuman: 1,
      essaysSubmittedTotal: 1,
      humanReviewRate: 1,
    },
    generatedAt: new Date('2026-05-18T12:00:00.000Z'),
    sourceEssayCount: 1,
    ...overrides,
  } as unknown as ClassEssaySnapshot;
}

describe('ClassEssayAnalyticsService', () => {
  let service: ClassEssayAnalyticsService;
  let classService: jest.Mocked<ClassService>;
  let repository: jest.Mocked<ClassEssayAnalyticsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassEssayAnalyticsService,
        {
          provide: ClassService,
          useValue: {
            findOneById: jest.fn(),
          },
        },
        {
          provide: ClassEssayAnalyticsRepository,
          useValue: {
            findOneByMonth: jest.fn(),
            listByClass: jest.fn(),
            upsert: jest.fn(),
            aggregateMonth: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ClassEssayAnalyticsService);
    classService = module.get(ClassService) as jest.Mocked<ClassService>;
    repository = module.get(
      ClassEssayAnalyticsRepository,
    ) as jest.Mocked<ClassEssayAnalyticsRepository>;
  });

  // ── listMonths ──────────────────────────────────────────────────────────────

  describe('listMonths', () => {
    it('returns months: [] and totalStudents=1 (one Enrolled) when repo returns empty array', async () => {
      classService.findOneById.mockResolvedValue(makeClass());
      repository.listByClass.mockResolvedValue([]);

      const result = await service.listMonths('class-1', 'requester-1');

      expect(result.months).toEqual([]);
      expect(result.classId).toBe('class-1');
      expect(result.className).toBe('Turma A');
      expect(result.totalStudents).toBe(1);
      expect(typeof result.coursePeriod.startDate).toBe('string');
      expect(typeof result.coursePeriod.endDate).toBe('string');
      expect(result.coursePeriod.startDate).toHaveLength(10);
      expect(result.coursePeriod.endDate).toHaveLength(10);
    });

    it('maps a snapshot from repo into the output DTO converting Dates to ISO strings', async () => {
      const snap = makeSnap();
      classService.findOneById.mockResolvedValue(makeClass());
      repository.listByClass.mockResolvedValue([snap]);

      const result = await service.listMonths('class-1', 'requester-1');

      expect(result.months).toHaveLength(1);
      const m = result.months[0];
      expect(m.month).toBe('2026-05');
      expect(m.monthStart).toBe(snap.monthStart.toISOString());
      expect(m.monthEnd).toBe(snap.monthEnd.toISOString());
      expect(m.geral).toBe(650);
      expect(m.competencias).toEqual(snap.payload.competencias);
      expect(m.studentsWithAtLeastOneHumanReview).toBe(1);
      expect(m.essaysReviewedByHuman).toBe(1);
      expect(m.essaysSubmittedTotal).toBe(1);
      expect(m.humanReviewRate).toBe(1);
      expect(m.generatedAt).toBe(snap.generatedAt.toISOString());
    });

    it('throws BadRequestException when class has no coursePeriodStartDate', async () => {
      classService.findOneById.mockResolvedValue(
        makeClass({ coursePeriodStartDate: null }),
      );

      await expect(
        service.listMonths('class-1', 'requester-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── getByMonth ──────────────────────────────────────────────────────────────

  describe('getByMonth', () => {
    it('throws NotFoundException when repo returns null', async () => {
      classService.findOneById.mockResolvedValue(makeClass());
      repository.findOneByMonth.mockResolvedValue(null);

      await expect(
        service.getByMonth('class-1', '2026-05', 'requester-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns merged shape with className and ISO-converted dates when repo returns a snapshot', async () => {
      const snap = makeSnap();
      classService.findOneById.mockResolvedValue(makeClass());
      repository.findOneByMonth.mockResolvedValue(snap);

      const result = await service.getByMonth(
        'class-1',
        '2026-05',
        'requester-1',
      );

      expect(result.classId).toBe('class-1');
      expect(result.className).toBe('Turma A');
      expect(result.month).toBe('2026-05');
      expect(result.monthStart).toBe(snap.monthStart.toISOString());
      expect(result.monthEnd).toBe(snap.monthEnd.toISOString());
      expect(result.geral).toBe(650);
      expect(result.competencias).toEqual(snap.payload.competencias);
      expect(result.studentsWithAtLeastOneHumanReview).toBe(1);
      expect(result.essaysReviewedByHuman).toBe(1);
      expect(result.essaysSubmittedTotal).toBe(1);
      expect(result.humanReviewRate).toBe(1);
      expect(result.generatedAt).toBe(snap.generatedAt.toISOString());
    });
  });

  // ── refresh ─────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('with scope=current invokes aggregateMonth and upsert exactly once', async () => {
      classService.findOneById.mockResolvedValue(makeClass());
      repository.aggregateMonth.mockResolvedValue({
        geral: 600,
        competencias: { c1: 120, c2: 120, c3: 120, c4: 120, c5: 120 },
        studentsWithAtLeastOneHumanReview: 1,
        essaysReviewedByHuman: 1,
        essaysSubmittedTotal: 1,
        humanReviewRate: 1,
      });
      repository.upsert.mockResolvedValue(makeSnap());

      const result = await service.refresh('class-1', 'current', 'requester-1');

      expect(repository.aggregateMonth).toHaveBeenCalledTimes(1);
      expect(repository.upsert).toHaveBeenCalledTimes(1);
      expect(result.enqueued).toHaveLength(1);
      expect(result.enqueued[0].classId).toBe('class-1');
      expect(result.enqueued[0].type).toBe('essay');
      expect(result.estimatedSeconds).toBe(1);
      const upsertArg = (repository.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertArg.userIds).toEqual(['user-1']);
      expect(upsertArg.userIds).not.toContain('user-2');
    });

    it('with scope=all invokes upsert >= 1 times all with the same classId', async () => {
      classService.findOneById.mockResolvedValue(
        makeClass({
          coursePeriodStartDate: new Date('2026-01-01'),
          coursePeriodEndDate: new Date('2026-12-31'),
        }),
      );
      repository.aggregateMonth.mockResolvedValue({
        geral: 0,
        competencias: { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 },
        studentsWithAtLeastOneHumanReview: 0,
        essaysReviewedByHuman: 0,
        essaysSubmittedTotal: 0,
        humanReviewRate: 0,
      });
      repository.upsert.mockResolvedValue(makeSnap());

      const result = await service.refresh('class-1', 'all', 'requester-1');

      expect(repository.upsert).toHaveBeenCalled();
      const calls = repository.upsert.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(1);
      expect(
        calls.every((args) => (args[0] as any).classId === 'class-1'),
      ).toBe(true);
      expect(result.enqueued.every((i) => i.type === 'essay')).toBe(true);
      expect(result.estimatedSeconds).toBe(result.enqueued.length * 1);
    });

    it('throws BadRequestException when period has ended', async () => {
      classService.findOneById.mockResolvedValue(
        makeClass({
          coursePeriodStartDate: new Date('2020-01-01'),
          coursePeriodEndDate: PAST_END,
        }),
      );

      await expect(
        service.refresh('class-1', 'current', 'requester-1'),
      ).rejects.toThrow(BadRequestException);

      expect(repository.aggregateMonth).not.toHaveBeenCalled();
      expect(repository.upsert).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when class has no coursePeriodStartDate', async () => {
      classService.findOneById.mockResolvedValue(
        makeClass({ coursePeriodStartDate: null }),
      );

      await expect(
        service.refresh('class-1', 'current', 'requester-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── refreshOneMonthInternal ─────────────────────────────────────────────────

  describe('refreshOneMonthInternal', () => {
    it('calls aggregateMonth then upsert with the right payload, never touching classService', async () => {
      const payload = {
        geral: 700,
        competencias: { c1: 140, c2: 140, c3: 140, c4: 140, c5: 140 },
        studentsWithAtLeastOneHumanReview: 2,
        essaysReviewedByHuman: 3,
        essaysSubmittedTotal: 4,
        humanReviewRate: 0.75,
      };
      repository.aggregateMonth.mockResolvedValue(payload);
      repository.upsert.mockResolvedValue(makeSnap());

      const monthStart = new Date('2026-05-01T00:00:00.000Z');
      const monthEnd = new Date('2026-05-31T23:59:59.000Z');

      await service.refreshOneMonthInternal({
        classId: 'class-1',
        month: '2026-05',
        monthStart,
        monthEnd,
        userIds: ['user-1', 'user-2'],
      });

      expect(classService.findOneById).not.toHaveBeenCalled();
      expect(repository.aggregateMonth).toHaveBeenCalledWith({
        classId: 'class-1',
        monthStart,
        monthEnd,
      });
      expect(repository.upsert).toHaveBeenCalledTimes(1);
      const upsertArg = repository.upsert.mock.calls[0][0] as any;
      expect(upsertArg.classId).toBe('class-1');
      expect(upsertArg.month).toBe('2026-05');
      expect(upsertArg.monthStart).toEqual(monthStart);
      expect(upsertArg.monthEnd).toEqual(monthEnd);
      expect(upsertArg.userIds).toEqual(['user-1', 'user-2']);
      expect(upsertArg.payload).toEqual(payload);
      expect(upsertArg.sourceEssayCount).toBe(payload.essaysReviewedByHuman);
      expect(upsertArg.generatedAt).toBeInstanceOf(Date);
    });
  });
});
