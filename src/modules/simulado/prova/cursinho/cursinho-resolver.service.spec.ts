import { ForbiddenException } from '@nestjs/common';
import { CursinhoResolverService } from './cursinho-resolver.service';

describe('CursinhoResolverService', () => {
  function make(collab: any) {
    const collaboratorRepository = {
      findActiveByUserIdWithPrep: jest.fn().mockResolvedValue(collab),
    };
    const service = new CursinhoResolverService(collaboratorRepository as any);
    return { service, collaboratorRepository };
  }

  it('retorna o id do partnerPrepCourse do colaborador ativo', async () => {
    const { service } = make({ partnerPrepCourse: { id: 'curs-1' } });
    await expect(service.resolveCursinhoIdByUserId('u1')).resolves.toBe(
      'curs-1',
    );
  });

  it('lança Forbidden quando não há colaborador ativo', async () => {
    const { service } = make(null);
    await expect(
      service.resolveCursinhoIdByUserId('u1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lança Forbidden quando colaborador sem cursinho vinculado', async () => {
    const { service } = make({ partnerPrepCourse: null });
    await expect(
      service.resolveCursinhoIdByUserId('u1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe('resolveCursinhoIdOuNull (023 · 02)', () => {
    it('colaborador ativo → id do cursinho', async () => {
      const { service } = make({ partnerPrepCourse: { id: 'curs-1' } });
      await expect(service.resolveCursinhoIdOuNull('u1')).resolves.toBe(
        'curs-1',
      );
    });

    it('⚠️ sem colaborador → null, sem 403 (admin puro)', async () => {
      const { service } = make(null);
      await expect(service.resolveCursinhoIdOuNull('u1')).resolves.toBeNull();
    });

    it('colaborador sem cursinho → null', async () => {
      const { service } = make({ partnerPrepCourse: null });
      await expect(service.resolveCursinhoIdOuNull('u1')).resolves.toBeNull();
    });
  });
});
