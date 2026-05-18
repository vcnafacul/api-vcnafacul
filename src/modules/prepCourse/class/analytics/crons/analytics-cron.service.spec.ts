import { ClassService } from '../../class.service';
import { AnalyticsQueueService } from '../queue/analytics-queue.service';
import { AnalyticsCronService } from './analytics-cron.service';

describe('AnalyticsCronService', () => {
  let classService: jest.Mocked<ClassService>;
  let queue: jest.Mocked<AnalyticsQueueService>;
  let cron: AnalyticsCronService;

  beforeEach(() => {
    classService = { findAllWithActivePeriod: jest.fn() } as any;
    queue = {
      enqueue: jest.fn().mockResolvedValue('id'),
      enqueueMany: jest.fn().mockResolvedValue([]),
    } as any;
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

  it('weekly cron enqueues 2 jobs (simulado+essay) per active class for current month', async () => {
    classService.findAllWithActivePeriod.mockResolvedValue([
      klass('c1', '2026-01-01', '2026-12-31'),
      klass('c2', '2026-01-01', '2026-12-31'),
    ]);

    await cron.weeklyRefreshCurrentMonth();

    expect(queue.enqueueMany).toHaveBeenCalledTimes(1);
    const items = queue.enqueueMany.mock.calls[0][0];
    expect(items).toHaveLength(4);

    const byClass = items.reduce(
      (acc: Record<string, string[]>, item) => {
        acc[item.classId] = (acc[item.classId] ?? []).concat(item.type);
        return acc;
      },
      {},
    );
    expect(byClass.c1.sort()).toEqual(['essay', 'simulado']);
    expect(byClass.c2.sort()).toEqual(['essay', 'simulado']);

    const months = new Set(items.map((i) => i.month));
    expect(months.size).toBe(1);
  });

  it('monthly cron enqueues 2 jobs (simulado+essay) per month for each active class', async () => {
    classService.findAllWithActivePeriod.mockResolvedValue([
      klass('c1', '2026-01-01', '2026-03-31'),
    ]);

    await cron.monthlyRefreshAllMonths();

    expect(queue.enqueueMany).toHaveBeenCalledTimes(1);
    const items = queue.enqueueMany.mock.calls[0][0];

    expect(items.every((i) => i.classId === 'c1')).toBe(true);

    const uniqueMonths = new Set(items.map((i) => i.month));
    expect(items.length).toBe(uniqueMonths.size * 2);

    for (const month of uniqueMonths) {
      const typesForMonth = items
        .filter((i) => i.month === month)
        .map((i) => i.type)
        .sort();
      expect(typesForMonth).toEqual(['essay', 'simulado']);
    }
  });

  it('skips classes without coursePeriod and never calls enqueueMany when nothing remains', async () => {
    classService.findAllWithActivePeriod.mockResolvedValue([
      { id: 'c1', coursePeriod: null } as any,
    ]);

    await cron.weeklyRefreshCurrentMonth();
    expect(queue.enqueueMany).not.toHaveBeenCalled();
  });
});
