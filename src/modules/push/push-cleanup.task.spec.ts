import {
  DIAS_DESATIVADO,
  DIAS_SEM_USO,
  PushCleanupTask,
  limitesDaLimpeza,
} from './push-cleanup.task';

describe('PushCleanupTask', () => {
  it('roda todo dia às 04:00 no horário de Brasília', () => {
    const opcoes = Reflect.getMetadata(
      'SCHEDULE_CRON_OPTIONS',
      PushCleanupTask.prototype.limpar,
    );
    expect(opcoes).toMatchObject({
      cronTime: '0 4 * * *',
      timeZone: 'America/Sao_Paulo',
    });
  });

  it('limites: 60 dias sem uso, 30 dias desativado', () => {
    const agora = new Date('2026-09-27T12:00:00Z');
    expect(DIAS_SEM_USO).toBe(60);
    expect(DIAS_DESATIVADO).toBe(30);
    expect(limitesDaLimpeza(agora)).toEqual({
      semUsoDesde: new Date('2026-07-29T12:00:00Z'),
      desativadoAntes: new Date('2026-08-28T12:00:00Z'),
    });
  });

  it('devolve as contagens das duas etapas', async () => {
    const devices = {
      apagarDesativadosAntes: jest.fn().mockResolvedValue(2),
      desativarSemUsoDesde: jest.fn().mockResolvedValue(3),
    };
    const task = new PushCleanupTask(devices as any);

    const r = await task.limpar(new Date('2026-09-27T12:00:00Z'));

    expect(r).toEqual({ desativados: 3, apagados: 2 });
  });
});
