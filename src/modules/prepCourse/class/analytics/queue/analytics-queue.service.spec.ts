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

  it('enqueue publishes to ANALYTICS_STREAM with classId+month', async () => {
    const id = await service.enqueue('class-1', '2026-05');
    expect(id).toBe('id-1');
    expect(producer.publish).toHaveBeenCalledWith(ANALYTICS_STREAM, {
      classId: 'class-1',
      month: '2026-05',
    });
  });

  it('enqueueMany publishes once per item', async () => {
    producer.publish
      .mockResolvedValueOnce('a')
      .mockResolvedValueOnce('b')
      .mockResolvedValueOnce('c');

    const ids = await service.enqueueMany([
      { classId: 'c1', month: '2026-01' },
      { classId: 'c1', month: '2026-02' },
      { classId: 'c2', month: '2026-03' },
    ]);

    expect(ids).toEqual(['a', 'b', 'c']);
    expect(producer.publish).toHaveBeenCalledTimes(3);
  });
});
