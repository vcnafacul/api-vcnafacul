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
});
