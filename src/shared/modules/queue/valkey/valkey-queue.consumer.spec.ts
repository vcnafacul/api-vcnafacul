import { ValkeyQueueConsumer } from './valkey-queue.consumer';

// Espera uma condição com timers reais: o laço de leitura tem pausas próprias.
async function esperar(cond: () => boolean, ms = 3000) {
  const fim = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > fim) throw new Error('condição não aconteceu a tempo');
    await new Promise((r) => setTimeout(r, 20));
  }
}

const erroNoGroup = () =>
  new Error(
    "NOGROUP No such key 'stream:analytics' or consumer group 'api-vcnafacul-analytics' in XREADGROUP with GROUP option",
  );

describe('ValkeyQueueConsumer', () => {
  it('does not busy-loop the event loop when started with no registrations', async () => {
    const redisMock = {
      xgroup: jest.fn(),
      xreadgroup: jest.fn(),
      xautoclaim: jest.fn(),
    };
    const consumer = new ValkeyQueueConsumer(redisMock as any);

    await consumer.onApplicationBootstrap();

    // If poll() were busy-spinning synchronously, this setImmediate callback
    // would never get a chance to run.
    const yielded = await new Promise((resolve) =>
      setImmediate(() => resolve(true)),
    );
    expect(yielded).toBe(true);

    consumer.onModuleDestroy();
  });

  it('creates the consumer group reading from the start of the stream', async () => {
    const redisMock = {
      xgroup: jest.fn().mockResolvedValue('OK'),
      xreadgroup: jest.fn().mockResolvedValue(null),
      xautoclaim: jest.fn().mockResolvedValue(null),
    };
    const consumer = new ValkeyQueueConsumer(redisMock as any);

    consumer.register(
      'stream:analytics',
      'api-vcnafacul-analytics',
      'worker-1',
      async () => {},
    );
    await consumer.onApplicationBootstrap();

    expect(redisMock.xgroup).toHaveBeenCalledWith(
      'CREATE',
      'stream:analytics',
      'api-vcnafacul-analytics',
      '0',
      'MKSTREAM',
    );

    consumer.onModuleDestroy();
  });

  // tickets/056 · 05b: grupo ausente (Redis recriado vazio, ou registro feito
  // depois do consumidor iniciar) matava o laço no primeiro NOGROUP.
  it('recreates the group and keeps reading when the group disappears (NOGROUP)', async () => {
    const mensagem = [['stream:analytics', [['1-0', ['histId', 'h1']]]]];
    const redisMock = {
      xgroup: jest.fn().mockResolvedValue('OK'),
      xreadgroup: jest
        .fn()
        .mockRejectedValueOnce(erroNoGroup())
        .mockResolvedValueOnce(mensagem)
        .mockResolvedValue(null),
      xautoclaim: jest.fn().mockResolvedValue(null),
      xack: jest.fn().mockResolvedValue(1),
      xdel: jest.fn().mockResolvedValue(1),
    };
    const handler = jest.fn().mockResolvedValue(undefined);
    const consumer = new ValkeyQueueConsumer(redisMock as any);
    consumer.register(
      'stream:analytics',
      'api-vcnafacul-analytics',
      'worker-1',
      handler,
    );

    await consumer.onApplicationBootstrap();
    await esperar(() => handler.mock.calls.length > 0);
    consumer.onModuleDestroy();

    expect(redisMock.xgroup).toHaveBeenCalledTimes(2); // bootstrap + recriação
    expect(redisMock.xgroup).toHaveBeenLastCalledWith(
      'CREATE',
      'stream:analytics',
      'api-vcnafacul-analytics',
      '0',
      'MKSTREAM',
    );
    expect(handler).toHaveBeenCalledWith('1-0', { histId: 'h1' });
  });

  it('keeps polling after an unexpected read error instead of stopping for good', async () => {
    const redisMock = {
      xgroup: jest.fn().mockResolvedValue('OK'),
      xreadgroup: jest
        .fn()
        .mockRejectedValueOnce(new Error('Connection is closed.'))
        .mockResolvedValue(null),
      xautoclaim: jest.fn().mockResolvedValue(null),
    };
    const consumer = new ValkeyQueueConsumer(redisMock as any);
    consumer.register(
      'stream:analytics',
      'api-vcnafacul-analytics',
      'worker-1',
      async () => {},
    );

    await consumer.onApplicationBootstrap();
    await esperar(() => redisMock.xreadgroup.mock.calls.length >= 2);
    consumer.onModuleDestroy();

    expect(redisMock.xreadgroup.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('survives the group recreation failing too (Redis still down)', async () => {
    const redisMock = {
      xgroup: jest
        .fn()
        .mockResolvedValueOnce('OK')
        .mockRejectedValueOnce(new Error('Connection is closed.'))
        .mockResolvedValue('OK'),
      xreadgroup: jest
        .fn()
        .mockRejectedValueOnce(erroNoGroup())
        .mockResolvedValue(null),
      xautoclaim: jest.fn().mockResolvedValue(null),
    };
    const consumer = new ValkeyQueueConsumer(redisMock as any);
    consumer.register(
      'stream:analytics',
      'api-vcnafacul-analytics',
      'worker-1',
      async () => {},
    );

    await consumer.onApplicationBootstrap();
    await esperar(() => redisMock.xreadgroup.mock.calls.length >= 2);
    consumer.onModuleDestroy();

    expect(redisMock.xreadgroup.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  // O módulo da fila inicia antes do módulo de analytics: com o grupo criado
  // no onModuleInit, o register() do AnalyticsWorkerService chegava tarde e a
  // fila nunca era lida.
  it('creates the group of a stream registered after init, at bootstrap', async () => {
    const redisMock = {
      xgroup: jest.fn().mockResolvedValue('OK'),
      xreadgroup: jest.fn().mockResolvedValue(null),
      xautoclaim: jest.fn().mockResolvedValue(null),
    };
    const consumer = new ValkeyQueueConsumer(redisMock as any);

    expect((consumer as any).onModuleInit).toBeUndefined();
    consumer.register(
      'stream:analytics',
      'api-vcnafacul-analytics',
      'worker-1',
      async () => {},
    );
    await consumer.onApplicationBootstrap();

    expect(redisMock.xgroup).toHaveBeenCalledWith(
      'CREATE',
      'stream:analytics',
      'api-vcnafacul-analytics',
      '0',
      'MKSTREAM',
    );
    consumer.onModuleDestroy();
  });
});
