import { ClassService } from '../../class.service';
import { AnalyticsQueueService } from '../queue/analytics-queue.service';
import { AnalyticsCronService } from './analytics-cron.service';

describe('AnalyticsCronService', () => {
  let classService: jest.Mocked<ClassService>;
  let queue: jest.Mocked<AnalyticsQueueService>;
  let cron: AnalyticsCronService;

  beforeEach(() => {
    classService = { findAllWithActivePeriod: jest.fn() } as any;
    queue = { enqueue: jest.fn().mockResolvedValue('id'), enqueueMany: jest.fn() } as any;
    cron = new AnalyticsCronService(classService, queue);
  });

  const klass = (id: string, startDate: string, endDate: string) =>
    ({
      id,
      coursePeriod: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    }) as any;

  it('weekly cron enqueues current month for each active class', async () => {
    classService.findAllWithActivePeriod.mockResolvedValue([
      klass('c1', '2026-01-01', '2026-12-31'),
      klass('c2', '2026-01-01', '2026-12-31'),
    ]);

    await cron.weeklyRefreshCurrentMonth();

    expect(queue.enqueue).toHaveBeenCalledTimes(2);
    // Both classes get the same current month (last month of period or today)
    const months = queue.enqueue.mock.calls.map((c) => c[1]);
    expect(new Set(months).size).toBe(1);
  });

  it('monthly cron enqueues all months for each active class', async () => {
    classService.findAllWithActivePeriod.mockResolvedValue([
      klass('c1', '2026-01-01', '2026-03-31'),
    ]);

    await cron.monthlyRefreshAllMonths();

    // Period covers Jan, Feb, Mar — 3 months for 1 class
    expect(queue.enqueue.mock.calls.length).toBeGreaterThanOrEqual(1);
    const calls = queue.enqueue.mock.calls;
    expect(calls.every((c) => c[0] === 'c1')).toBe(true);
  });

  it('skips classes without coursePeriod', async () => {
    classService.findAllWithActivePeriod.mockResolvedValue([
      { id: 'c1', coursePeriod: null } as any,
    ]);

    await cron.weeklyRefreshCurrentMonth();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
