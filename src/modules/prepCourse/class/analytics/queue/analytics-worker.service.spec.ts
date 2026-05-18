import { SimuladoHttpService } from 'src/shared/services/simulado-http.service';
import { ClassService } from '../../class.service';
import { ClassEssayAnalyticsService } from '../../essay-analytics/class-essay-analytics.service';
import { QueueConsumer } from '../../../../../shared/modules/queue/queue.consumer';
import { AnalyticsWorkerService } from './analytics-worker.service';
import { StatusApplication } from '../../../studentCourse/enums/stastusApplication';

describe('AnalyticsWorkerService', () => {
  let consumer: jest.Mocked<QueueConsumer>;
  let classService: jest.Mocked<ClassService>;
  let simuladoHttp: jest.Mocked<SimuladoHttpService>;
  let essayAnalytics: jest.Mocked<ClassEssayAnalyticsService>;
  let worker: AnalyticsWorkerService;

  beforeEach(() => {
    consumer = { register: jest.fn() } as any;
    classService = { findOneByIdForAnalytics: jest.fn() } as any;
    simuladoHttp = { calculateUserGroupAggregate: jest.fn() } as any;
    essayAnalytics = { refreshOneMonthInternal: jest.fn() } as any;
    worker = new AnalyticsWorkerService(
      consumer,
      classService,
      simuladoHttp,
      essayAnalytics,
    );
  });

  const activeKlass = (students: any[] = []) =>
    ({
      id: 'class-1',
      coursePeriod: {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
      students,
    }) as any;

  it('registers consumer on init', () => {
    worker.onModuleInit();
    expect(consumer.register).toHaveBeenCalledWith(
      'stream:vcnafacul:analytics-recalc',
      'api-vcnafacul-analytics',
      'worker-1',
      expect.any(Function),
    );
  });

  it('type=simulado calls simuladoHttp with enrolled userIds only', async () => {
    classService.findOneByIdForAnalytics.mockResolvedValue(
      activeKlass([
        { userId: 'u1', applicationStatus: StatusApplication.Enrolled },
        { userId: 'u2', applicationStatus: StatusApplication.Rejected },
        { userId: 'u3', applicationStatus: StatusApplication.Enrolled },
      ]),
    );
    simuladoHttp.calculateUserGroupAggregate.mockResolvedValue({} as any);

    await worker.handle('msg-1', {
      classId: 'class-1',
      month: '2026-05',
      type: 'simulado',
    });

    expect(simuladoHttp.calculateUserGroupAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: 'class-1',
        month: '2026-05',
        userIds: ['u1', 'u3'],
      }),
    );
    expect(essayAnalytics.refreshOneMonthInternal).not.toHaveBeenCalled();
  });

  it('defaults to simulado when type is missing (back-compat)', async () => {
    classService.findOneByIdForAnalytics.mockResolvedValue(activeKlass([]));
    simuladoHttp.calculateUserGroupAggregate.mockResolvedValue({} as any);

    await worker.handle('msg-1', { classId: 'class-1', month: '2026-05' });

    expect(simuladoHttp.calculateUserGroupAggregate).toHaveBeenCalled();
    expect(essayAnalytics.refreshOneMonthInternal).not.toHaveBeenCalled();
  });

  it('type=essay calls essayAnalytics with enrolled userIds only', async () => {
    classService.findOneByIdForAnalytics.mockResolvedValue(
      activeKlass([
        { userId: 'u1', applicationStatus: StatusApplication.Enrolled },
        { userId: 'u2', applicationStatus: StatusApplication.UnderReview },
      ]),
    );
    essayAnalytics.refreshOneMonthInternal.mockResolvedValue({} as any);

    await worker.handle('msg-1', {
      classId: 'class-1',
      month: '2026-05',
      type: 'essay',
    });

    expect(essayAnalytics.refreshOneMonthInternal).toHaveBeenCalledWith(
      expect.objectContaining({
        classId: 'class-1',
        month: '2026-05',
        userIds: ['u1'],
      }),
    );
    expect(simuladoHttp.calculateUserGroupAggregate).not.toHaveBeenCalled();
  });

  it('unknown type logs warning and dispatches nothing', async () => {
    classService.findOneByIdForAnalytics.mockResolvedValue(activeKlass([]));

    await worker.handle('msg-1', {
      classId: 'class-1',
      month: '2026-05',
      type: 'mystery',
    });

    expect(simuladoHttp.calculateUserGroupAggregate).not.toHaveBeenCalled();
    expect(essayAnalytics.refreshOneMonthInternal).not.toHaveBeenCalled();
  });

  it('skips when class not found', async () => {
    classService.findOneByIdForAnalytics.mockResolvedValue(null);
    await worker.handle('m', { classId: 'missing', month: '2026-05' });
    expect(simuladoHttp.calculateUserGroupAggregate).not.toHaveBeenCalled();
    expect(essayAnalytics.refreshOneMonthInternal).not.toHaveBeenCalled();
  });

  it('skips when missing fields', async () => {
    await worker.handle('m', { classId: 'x' });
    expect(classService.findOneByIdForAnalytics).not.toHaveBeenCalled();
  });

  it('propagates error from simulado handler so queue retries', async () => {
    classService.findOneByIdForAnalytics.mockResolvedValue(activeKlass([]));
    simuladoHttp.calculateUserGroupAggregate.mockRejectedValue(
      new Error('boom'),
    );

    await expect(
      worker.handle('m', { classId: 'class-1', month: '2026-05' }),
    ).rejects.toThrow('boom');
  });

  it('propagates error from essay handler so queue retries', async () => {
    classService.findOneByIdForAnalytics.mockResolvedValue(activeKlass([]));
    essayAnalytics.refreshOneMonthInternal.mockRejectedValue(
      new Error('essay-boom'),
    );

    await expect(
      worker.handle('m', {
        classId: 'class-1',
        month: '2026-05',
        type: 'essay',
      }),
    ).rejects.toThrow('essay-boom');
  });
});
