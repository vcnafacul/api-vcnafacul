import { QueueProducer } from '../../../../../shared/modules/queue/queue.producer';
import {
  ANALYTICS_STREAM,
  AnalyticsQueueService,
} from './analytics-queue.service';

describe('AnalyticsQueueService', () => {
  let producer: jest.Mocked<QueueProducer>;
  let service: AnalyticsQueueService;

  beforeEach(() => {
    producer = { publish: jest.fn().mockResolvedValue('id-1') } as any;
    service = new AnalyticsQueueService(producer);
  });

  it('enqueue defaults type to simulado when omitted', async () => {
    const id = await service.enqueue('class-1', '2026-05');
    expect(id).toBe('id-1');
    expect(producer.publish).toHaveBeenCalledWith(ANALYTICS_STREAM, {
      classId: 'class-1',
      month: '2026-05',
      type: 'simulado',
    });
  });

  it('enqueue publishes essay type when requested', async () => {
    await service.enqueue('class-1', '2026-05', 'essay');
    expect(producer.publish).toHaveBeenCalledWith(ANALYTICS_STREAM, {
      classId: 'class-1',
      month: '2026-05',
      type: 'essay',
    });
  });

  it('enqueueMany publishes once per item with explicit type', async () => {
    producer.publish
      .mockResolvedValueOnce('a')
      .mockResolvedValueOnce('b')
      .mockResolvedValueOnce('c');

    const ids = await service.enqueueMany([
      { classId: 'c1', month: '2026-01', type: 'simulado' },
      { classId: 'c1', month: '2026-02', type: 'essay' },
      { classId: 'c2', month: '2026-03', type: 'essay' },
    ]);

    expect(ids).toEqual(['a', 'b', 'c']);
    expect(producer.publish).toHaveBeenCalledTimes(3);
    expect(producer.publish).toHaveBeenNthCalledWith(1, ANALYTICS_STREAM, {
      classId: 'c1',
      month: '2026-01',
      type: 'simulado',
    });
    expect(producer.publish).toHaveBeenNthCalledWith(2, ANALYTICS_STREAM, {
      classId: 'c1',
      month: '2026-02',
      type: 'essay',
    });
    expect(producer.publish).toHaveBeenNthCalledWith(3, ANALYTICS_STREAM, {
      classId: 'c2',
      month: '2026-03',
      type: 'essay',
    });
  });

  it('enqueueMany defaults missing type to simulado (back-compat)', async () => {
    await service.enqueueMany([{ classId: 'c1', month: '2026-01' }]);
    expect(producer.publish).toHaveBeenCalledWith(ANALYTICS_STREAM, {
      classId: 'c1',
      month: '2026-01',
      type: 'simulado',
    });
  });
});
