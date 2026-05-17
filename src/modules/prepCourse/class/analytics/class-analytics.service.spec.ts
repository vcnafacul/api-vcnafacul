import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StatusApplication } from '../../studentCourse/enums/stastusApplication';
import { ClassAnalyticsService } from './class-analytics.service';
import { ClassService } from '../class.service';
import { SimuladoHttpService } from 'src/shared/services/simulado-http.service';
import { AnalyticsQueueService } from './queue/analytics-queue.service';

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

describe('ClassAnalyticsService', () => {
  let service: ClassAnalyticsService;
  let classService: jest.Mocked<ClassService>;
  let simuladoHttp: jest.Mocked<SimuladoHttpService>;
  let queue: jest.Mocked<AnalyticsQueueService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassAnalyticsService,
        {
          provide: ClassService,
          useValue: {
            findOneById: jest.fn(),
          },
        },
        {
          provide: SimuladoHttpService,
          useValue: {
            listUserGroupAggregates: jest.fn(),
            getUserGroupAggregateByMonth: jest.fn(),
            calculateUserGroupAggregate: jest.fn(),
          },
        },
        {
          provide: AnalyticsQueueService,
          useValue: {
            enqueue: jest.fn().mockResolvedValue('id-1'),
            enqueueMany: jest.fn().mockResolvedValue(['id-1']),
          },
        },
      ],
    }).compile();

    service = module.get(ClassAnalyticsService);
    classService = module.get(ClassService) as jest.Mocked<ClassService>;
    simuladoHttp = module.get(SimuladoHttpService) as jest.Mocked<SimuladoHttpService>;
    queue = module.get(AnalyticsQueueService) as jest.Mocked<AnalyticsQueueService>;
  });

  // ── listMonths ──────────────────────────────────────────────────────────────

  describe('listMonths', () => {
    it('returns months: [] when ms-simulado returns empty array', async () => {
      classService.findOneById.mockResolvedValue(makeClass());
      simuladoHttp.listUserGroupAggregates.mockResolvedValue([]);

      const result = await service.listMonths('class-1', 'requester-1');

      expect(result.months).toEqual([]);
      expect(result.classId).toBe('class-1');
      expect(result.className).toBe('Turma A');
      expect(result.totalStudents).toBe(2);
    });

    it('maps ms-simulado documents correctly to output', async () => {
      const now = new Date().toISOString();
      const doc = {
        month: '2025-01',
        monthStart: '2025-01-01T00:00:00.000Z',
        monthEnd: '2025-01-31T23:59:59.000Z',
        payload: {
          geral: { average: 0.65, total: 10 },
          studentsWithAtLeastOneCompletedAttempt: 5,
          totalAttemptsCompleted: 20,
        },
        generatedAt: now,
      };

      classService.findOneById.mockResolvedValue(makeClass());
      simuladoHttp.listUserGroupAggregates.mockResolvedValue([doc]);

      const result = await service.listMonths('class-1', 'requester-1');

      expect(result.months).toHaveLength(1);
      const m = result.months[0];
      expect(m.month).toBe('2025-01');
      expect(m.monthStart).toBe(doc.monthStart);
      expect(m.monthEnd).toBe(doc.monthEnd);
      expect(m.geral).toEqual(doc.payload.geral);
      expect(m.studentsWithAtLeastOneCompletedAttempt).toBe(5);
      expect(m.totalAttemptsCompleted).toBe(20);
      expect(m.generatedAt).toBe(now);
    });
  });

  // ── getByMonth ──────────────────────────────────────────────────────────────

  describe('getByMonth', () => {
    it('throws NotFoundException when ms-simulado returns null', async () => {
      classService.findOneById.mockResolvedValue(makeClass());
      simuladoHttp.getUserGroupAggregateByMonth.mockResolvedValue(null);

      await expect(
        service.getByMonth('class-1', '2025-01', 'requester-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns merged data when ms-simulado returns a document', async () => {
      const now = new Date().toISOString();
      const doc = {
        month: '2025-01',
        monthStart: '2025-01-01T00:00:00.000Z',
        monthEnd: '2025-01-31T23:59:59.000Z',
        payload: {
          geral: { average: 0.7 },
          studentsWithAtLeastOneCompletedAttempt: 3,
          totalAttemptsCompleted: 9,
        },
        generatedAt: now,
      };

      classService.findOneById.mockResolvedValue(makeClass());
      simuladoHttp.getUserGroupAggregateByMonth.mockResolvedValue(doc);

      const result = await service.getByMonth('class-1', '2025-01', 'requester-1');

      expect(result.classId).toBe('class-1');
      expect(result.className).toBe('Turma A');
      expect(result.month).toBe('2025-01');
      expect(result.monthStart).toBe(doc.monthStart);
      expect(result.monthEnd).toBe(doc.monthEnd);
      expect(result.geral).toEqual(doc.payload.geral);
      expect(result.generatedAt).toBe(now);
    });
  });

  // ── refresh ─────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('with scope=current enqueues exactly one message', async () => {
      classService.findOneById.mockResolvedValue(makeClass());

      const result = await service.refresh('class-1', 'current', 'requester-1');

      expect(queue.enqueueMany).toHaveBeenCalledTimes(1);
      const items = queue.enqueueMany.mock.calls[0][0];
      expect(items).toHaveLength(1);
      expect(items[0].classId).toBe('class-1');
      expect(simuladoHttp.calculateUserGroupAggregate).not.toHaveBeenCalled();
      expect(result.enqueued).toHaveLength(1);
      expect(result.estimatedSeconds).toBe(2);
    });

    it('throws BadRequestException when class period has ended', async () => {
      classService.findOneById.mockResolvedValue(
        makeClass({
          coursePeriodStartDate: new Date('2020-01-01'),
          coursePeriodEndDate: PAST_END,
        }),
      );

      await expect(
        service.refresh('class-1', 'current', 'requester-1'),
      ).rejects.toThrow(BadRequestException);

      expect(queue.enqueueMany).not.toHaveBeenCalled();
    });

    it('with scope=all enqueues one message per month of the period', async () => {
      classService.findOneById.mockResolvedValue(
        makeClass({
          coursePeriodStartDate: new Date('2026-01-01'),
          coursePeriodEndDate: new Date('2026-12-31'),
        }),
      );

      await service.refresh('class-1', 'all', 'requester-1');

      const items = queue.enqueueMany.mock.calls[0][0];
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.every((i) => i.classId === 'class-1')).toBe(true);
    });
  });
});
