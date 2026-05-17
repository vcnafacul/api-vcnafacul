import { SimuladoHttpService } from 'src/shared/services/simulado-http.service';
import { ClassService } from '../../class.service';
import { QueueConsumer } from '../../../../../shared/modules/queue/queue.consumer';
import { AnalyticsWorkerService } from './analytics-worker.service';
import { StatusApplication } from '../../../studentCourse/enums/stastusApplication';

describe('AnalyticsWorkerService', () => {
  let consumer: jest.Mocked<QueueConsumer>;
  let classService: jest.Mocked<ClassService>;
  let simuladoHttp: jest.Mocked<SimuladoHttpService>;
  let worker: AnalyticsWorkerService;

  beforeEach(() => {
    consumer = { register: jest.fn() } as any;
    classService = { findOneByIdForAnalytics: jest.fn() } as any;
    simuladoHttp = { calculateUserGroupAggregate: jest.fn() } as any;
    worker = new AnalyticsWorkerService(consumer, classService, simuladoHttp);
  });

  it('registers consumer on init', () => {
    worker.onModuleInit();
    expect(consumer.register).toHaveBeenCalledWith(
      'stream:vcnafacul:analytics-recalc',
      'api-vcnafacul-analytics',
      'worker-1',
      expect.any(Function),
    );
  });

  it('calls calculate with enrolled userIds only', async () => {
    classService.findOneByIdForAnalytics.mockResolvedValue({
      id: 'class-1',
      coursePeriod: {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
      students: [
        { userId: 'u1', applicationStatus: StatusApplication.Enrolled },
        { userId: 'u2', applicationStatus: StatusApplication.Rejected },
        { userId: 'u3', applicationStatus: StatusApplication.Enrolled },
      ],
    } as any);
    simuladoHttp.calculateUserGroupAggregate.mockResolvedValue({} as any);

    await worker.handle('msg-1', { classId: 'class-1', month: '2026-05' });

    expect(simuladoHttp.calculateUserGroupAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: 'class-1',
        month: '2026-05',
        userIds: ['u1', 'u3'],
      }),
    );
  });

  it('skips when class not found', async () => {
    classService.findOneByIdForAnalytics.mockResolvedValue(null);
    await worker.handle('m', { classId: 'missing', month: '2026-05' });
    expect(simuladoHttp.calculateUserGroupAggregate).not.toHaveBeenCalled();
  });

  it('skips when missing fields', async () => {
    await worker.handle('m', { classId: 'x' });
    expect(classService.findOneByIdForAnalytics).not.toHaveBeenCalled();
  });

  it('propagates error so Valkey can retry', async () => {
    classService.findOneByIdForAnalytics.mockResolvedValue({
      id: 'class-1',
      coursePeriod: {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
      students: [],
    } as any);
    simuladoHttp.calculateUserGroupAggregate.mockRejectedValue(new Error('boom'));

    await expect(
      worker.handle('m', { classId: 'class-1', month: '2026-05' }),
    ).rejects.toThrow('boom');
  });
});
