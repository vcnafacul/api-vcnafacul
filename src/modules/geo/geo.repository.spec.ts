import { Geolocation } from './geo.entity';
import { GeoRepository } from './geo.repository';

describe('GeoRepository.update', () => {
  it('⚠️ só termina depois que o banco gravou (e propaga o erro)', async () => {
    let gravar: () => void = () => undefined;
    const save = jest.fn(
      () => new Promise<void>((resolve) => (gravar = resolve)),
    );
    const repo = new GeoRepository({
      getRepository: () => ({ save }),
    } as any);

    let terminou = false;
    const update = repo.update(new Geolocation()).then(() => {
      terminou = true;
    });
    await new Promise((r) => setImmediate(r));
    expect(terminou).toBe(false); // o save ainda não voltou

    gravar();
    await update;
    expect(terminou).toBe(true);
  });

  it('erro do banco chega a quem chamou', async () => {
    const repo = new GeoRepository({
      getRepository: () => ({
        save: jest.fn().mockRejectedValue(new Error('db')),
      }),
    } as any);
    await expect(repo.update(new Geolocation())).rejects.toThrow('db');
  });
});
