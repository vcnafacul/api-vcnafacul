import { z } from 'zod';
import { chavesFaltando } from './verificar-env';

describe('chavesFaltando', () => {
  it('lista as chaves do schema que o arquivo não define', () => {
    const schema = z.object({
      A: z.string(),
      B: z.string().default('x'),
      C: z.string(),
    });
    expect(chavesFaltando([schema], { A: '1' })).toEqual(['B', 'C']);
  });

  it('vazio quando o arquivo cobre tudo', () => {
    const schema = z.object({ A: z.string() });
    expect(chavesFaltando([schema], { A: '1' })).toEqual([]);
  });
});
