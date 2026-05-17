import { ValkeyQueueProducer } from './valkey-queue.producer';

describe('ValkeyQueueProducer', () => {
  it('calls xadd with stream and payload', async () => {
    const redisMock = { xadd: jest.fn().mockResolvedValue('1717000000001-0') };
    const producer = new ValkeyQueueProducer(redisMock as any);

    const id = await producer.publish('stream:test', { foo: 'bar' });

    expect(id).toBe('1717000000001-0');
    expect(redisMock.xadd).toHaveBeenCalledWith(
      'stream:test',
      'MAXLEN',
      '~',
      '10000',
      '*',
      'foo',
      'bar',
    );
  });

  it('flattens multiple payload entries', async () => {
    const redisMock = { xadd: jest.fn().mockResolvedValue('1717000000002-0') };
    const producer = new ValkeyQueueProducer(redisMock as any);

    await producer.publish('stream:analytics', {
      classId: 'class-1',
      month: '2026-05',
    });

    expect(redisMock.xadd).toHaveBeenCalledWith(
      'stream:analytics',
      'MAXLEN',
      '~',
      '10000',
      '*',
      'classId',
      'class-1',
      'month',
      '2026-05',
    );
  });
});
