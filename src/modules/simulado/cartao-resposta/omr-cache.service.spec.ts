jest.mock('ioredis', () => ({ __esModule: true, default: jest.fn() }));
import Redis from 'ioredis';
import { OmrCacheService } from './omr-cache.service';

const setMock = jest.fn();
(Redis as unknown as jest.Mock).mockImplementation(() => ({ set: setMock }));
const env = {
  get: (k: string) => (k === 'REDIS_HOST' ? 'localhost' : 6379),
} as any;

beforeEach(() => {
  setMock.mockReset().mockResolvedValue('OK');
});

it('prime grava omr:img:{key} com EX 180', async () => {
  await new OmrCacheService(env).primeImagem(
    'cartoes/665/i.jpg',
    Buffer.from('IMG'),
  );
  expect(setMock).toHaveBeenCalledWith(
    'omr:img:cartoes/665/i.jpg',
    Buffer.from('IMG'),
    'EX',
    180,
  );
});

it('best-effort: erro no set não lança', async () => {
  setMock.mockRejectedValueOnce(new Error('down'));
  await expect(
    new OmrCacheService(env).primeImagem('k', Buffer.from('x')),
  ).resolves.toBeUndefined();
});
