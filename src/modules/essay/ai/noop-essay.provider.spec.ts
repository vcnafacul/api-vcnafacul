import { NoopEssayProvider } from './noop-essay.provider';

describe('NoopEssayProvider', () => {
  it('should throw when correctEssay is called', async () => {
    const provider = new NoopEssayProvider();
    await expect(provider.correctEssay()).rejects.toThrow(
      'AI correction is disabled',
    );
  });
});
