import { ConflictException, NotFoundException } from '@nestjs/common';
import { EmailWhitelistService } from './email-whitelist.service';

describe('EmailWhitelistService.create', () => {
  const agora = new Date('2026-11-25T12:00:00Z');

  function montar(nodeEnv = 'homologation', existente: unknown = null) {
    const repo = {
      findOne: jest.fn().mockResolvedValue(existente),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
    };
    const env = { get: jest.fn().mockReturnValue(nodeEnv) };
    return { service: new EmailWhitelistService(repo as any, env as any) };
  }

  it('grava ativo, em minúsculas e vencendo em 30 dias', async () => {
    const { service } = montar();

    const salvo = await service.create(
      { email: ' Fulano@Gmail.com ', note: ' celular ' },
      agora,
    );

    expect(salvo).toEqual({
      email: 'fulano@gmail.com',
      note: 'celular',
      createdAt: agora,
      expiredAt: new Date('2026-12-25T12:00:00Z'),
      isActived: true,
    });
  });

  it('e-mail repetido dá 409', async () => {
    const { service } = montar('homologation', { id: '1' });
    await expect(
      service.create({ email: 'a@a.com' }, agora),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('em produção dá 404', async () => {
    const { service } = montar('production');
    await expect(
      service.create({ email: 'a@a.com' }, agora),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
