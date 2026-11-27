import { EmailWhitelistTask } from './email-whitelist.task';
import {
  DIAS_DE_LIBERACAO,
  EmailWhitelistService,
  validadeDaLiberacao,
} from './email-whitelist.service';

describe('EmailWhitelistTask', () => {
  const agora = new Date('2026-11-25T12:00:00Z');

  function montar(nodeEnv: string, affected = 2) {
    const repo = { update: jest.fn().mockResolvedValue({ affected }) };
    const env = { get: jest.fn().mockReturnValue(nodeEnv) };
    const service = new EmailWhitelistService(repo as any, env as any);
    return { task: new EmailWhitelistTask(service, env as any), repo };
  }

  it('roda de hora em hora no horário de Brasília', () => {
    const opcoes = Reflect.getMetadata(
      'SCHEDULE_CRON_OPTIONS',
      EmailWhitelistTask.prototype.desativarVencidos,
    );
    expect(opcoes).toMatchObject({
      cronTime: '0 * * * *',
      timeZone: 'America/Sao_Paulo',
    });
  });

  it('liberação vale 30 dias a partir do cadastro', () => {
    expect(DIAS_DE_LIBERACAO).toBe(30);
    expect(validadeDaLiberacao(agora)).toEqual(
      new Date('2026-12-25T12:00:00Z'),
    );
  });

  it('desliga só as ativas com expired_at até agora', async () => {
    const { task, repo } = montar('homologation');

    await expect(task.desativarVencidos(agora)).resolves.toBe(2);

    const [where, valores] = repo.update.mock.calls[0];
    expect(where.isActived).toBe(true);
    expect(where.expiredAt.type).toBe('lessThanOrEqual');
    expect(where.expiredAt.value).toEqual(agora);
    expect(valores).toEqual({ isActived: false });
  });

  it('em produção não toca no banco', async () => {
    const { task, repo } = montar('production');

    await expect(task.desativarVencidos(agora)).resolves.toBe(0);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
