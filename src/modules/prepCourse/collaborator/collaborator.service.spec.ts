import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CollaboratorService } from './collaborator.service';
import { CollaboratorRepository } from './collaborator.repository';
import { CollaboratorFrenteRepository } from './collaborator-frente.repository';
import { PartnerPrepCourseService } from '../partnerPrepCourse/partner-prep-course.service';
import { RoleRepository } from 'src/modules/role/role.repository';
import { UserRepository } from 'src/modules/user/user.repository';
import { CacheService } from 'src/shared/modules/cache/cache.service';
import { EnvService } from 'src/shared/modules/env/env.service';
import { FrenteProxyService } from 'src/modules/simulado/frente/frente.service';
import { MateriaProxyService } from 'src/modules/simulado/materia/materia.service';
import { HttpException } from '@nestjs/common';
import { LogPartnerRepository } from '../partnerPrepCourse/log-partner/log-partner.repository';

describe('CollaboratorService — photo handling', () => {
  let service: CollaboratorService;
  let blobService: {
    uploadFile: jest.Mock;
    getFile: jest.Mock;
    deleteFile: jest.Mock;
  };
  let cache: { wrap: jest.Mock; set: jest.Mock; del: jest.Mock };
  let repository: {
    cursinhoDoColaborador: jest.Mock;
    findOneByUserId: jest.Mock;
    findOneBy: jest.Mock;
    findOneParaAtivacao: jest.Mock;
    update: jest.Mock;
  };
  let partnerPrepCourseService: { getByUserId: jest.Mock };
  let userRepository: { findOneBy: jest.Mock; update: jest.Mock };
  let roleRepository: { findOneBy: jest.Mock };
  let logPartnerRepository: { create: jest.Mock };

  beforeEach(async () => {
    blobService = {
      uploadFile: jest.fn(),
      getFile: jest.fn(),
      deleteFile: jest.fn(),
    };
    cache = { wrap: jest.fn(), set: jest.fn(), del: jest.fn() };
    repository = {
      findOneByUserId: jest.fn(),
      findOneBy: jest.fn(),
      findOneParaAtivacao: jest.fn(),
      update: jest.fn(),
      cursinhoDoColaborador: jest.fn().mockResolvedValue('cursinho-A'),
    };
    partnerPrepCourseService = {
      getByUserId: jest.fn().mockResolvedValue({ id: 'cursinho-A' }),
    };
    // Por padrão quem pede é o admin do cursinho.
    userRepository = {
      findOneBy: jest.fn().mockResolvedValue({
        id: 'gestor',
        role: { gerenciarPermissoesCursinho: true },
      }),
      update: jest.fn(),
    };
    roleRepository = {
      findOneBy: jest.fn().mockResolvedValue({ id: 'r-aluno', name: 'aluno' }),
    };
    logPartnerRepository = { create: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CollaboratorService,
        { provide: CollaboratorRepository, useValue: repository },
        {
          provide: PartnerPrepCourseService,
          useValue: partnerPrepCourseService,
        },
        {
          provide: EnvService,
          useValue: {
            get: (k: string) => (k === 'BUCKET_DOC' ? 'docs-bucket' : ''),
          },
        },
        { provide: RoleRepository, useValue: roleRepository },
        { provide: UserRepository, useValue: userRepository },
        { provide: 'BlobService', useValue: blobService },
        { provide: CacheService, useValue: cache },
        { provide: CollaboratorFrenteRepository, useValue: {} },
        { provide: FrenteProxyService, useValue: {} },
        { provide: MateriaProxyService, useValue: {} },
        { provide: LogPartnerRepository, useValue: logPartnerRepository },
      ],
    }).compile();

    service = moduleRef.get(CollaboratorService);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  describe('uploadImage (self)', () => {
    it('replaces an existing photo: deletes old blob, invalidates cache, uploads new, sets cache', async () => {
      const collaborator: any = { id: 'c-1', photo: 'old-key.jpg' };
      repository.findOneByUserId.mockResolvedValue(collaborator);
      blobService.uploadFile.mockResolvedValue('new-key.jpg');
      blobService.getFile.mockResolvedValue({
        buffer: 'b64',
        contentType: 'image/jpeg',
      });

      const file: any = {
        originalname: 'a.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('x'),
      };
      const result = await service.uploadImage(file, 'user-1');

      expect(blobService.deleteFile).toHaveBeenCalledWith(
        'old-key.jpg',
        'docs-bucket',
      );
      expect(cache.del).toHaveBeenCalledWith('collaborator:photo:old-key.jpg');
      expect(blobService.uploadFile).toHaveBeenCalledWith(
        file,
        'docs-bucket',
        undefined,
        'collaborators',
      );
      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({ photo: 'new-key.jpg' }),
      );
      expect(cache.set).toHaveBeenCalledWith(
        'collaborator:photo:new-key.jpg',
        { buffer: 'b64', contentType: 'image/jpeg' },
        1000 * 60 * 60 * 24 * 30, // 30 days
      );
      expect(result).toBe('new-key.jpg');
    });

    it('uploads when there is no prior photo: skips delete + cache.del', async () => {
      const collaborator: any = { id: 'c-2', photo: null };
      repository.findOneByUserId.mockResolvedValue(collaborator);
      blobService.uploadFile.mockResolvedValue('first-key.jpg');
      blobService.getFile.mockResolvedValue({
        buffer: 'b64',
        contentType: 'image/jpeg',
      });

      const file: any = {
        originalname: 'a.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('x'),
      };
      await service.uploadImage(file, 'user-2');

      expect(blobService.deleteFile).not.toHaveBeenCalled();
      // Sem foto antiga, nada de foto sai do cache (o `del` da página, sim).
      expect(
        cache.del.mock.calls.filter(([k]) =>
          k.startsWith('collaborator:photo:'),
        ),
      ).toEqual([]);
      expect(blobService.uploadFile).toHaveBeenCalledWith(
        file,
        'docs-bucket',
        undefined,
        'collaborators',
      );
      expect(cache.set).toHaveBeenCalled();
    });

    it('throws HttpException 400 when uploadFile returns falsy', async () => {
      const collaborator: any = { id: 'c-3', photo: null };
      repository.findOneByUserId.mockResolvedValue(collaborator);
      blobService.uploadFile.mockResolvedValue(undefined);

      const file: any = {
        originalname: 'a.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('x'),
      };
      await expect(service.uploadImage(file, 'user-3')).rejects.toThrow(
        'error to upload file',
      );
    });

    it('uses 30-day TTL on cache.set after upload', async () => {
      const collaborator: any = { id: 'c-ttl', photo: null };
      repository.findOneByUserId.mockResolvedValue(collaborator);
      blobService.uploadFile.mockResolvedValue('ttl-key.jpg');
      blobService.getFile.mockResolvedValue({
        buffer: 'b64',
        contentType: 'image/jpeg',
      });

      const file: any = {
        originalname: 'a.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('x'),
      };
      await service.uploadImage(file, 'user-ttl');

      expect(cache.set).toHaveBeenCalledWith(
        'collaborator:photo:ttl-key.jpg',
        { buffer: 'b64', contentType: 'image/jpeg' },
        1000 * 60 * 60 * 24 * 30,
      );
    });

    it('continues upload when deleting old blob fails (best-effort)', async () => {
      const collaborator: any = { id: 'c-4', photo: 'old.jpg' };
      repository.findOneByUserId.mockResolvedValue(collaborator);
      blobService.deleteFile.mockRejectedValue(new Error('boom'));
      blobService.uploadFile.mockResolvedValue('new.jpg');
      blobService.getFile.mockResolvedValue({
        buffer: 'b64',
        contentType: 'image/jpeg',
      });

      const file: any = {
        originalname: 'a.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('x'),
      };
      const result = await service.uploadImage(file, 'user-4');
      expect(result).toBe('new.jpg');
    });
  });

  describe('uploadImageByCollaboratorId (admin)', () => {
    it('throws 404 when collaborator id is unknown', async () => {
      repository.findOneBy.mockResolvedValue(null);
      const file: any = {
        originalname: 'a.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('x'),
      };
      await expect(
        service.uploadImageByCollaboratorId(file, 'missing-id'),
      ).rejects.toMatchObject({
        status: 404,
        message: 'Collaborator not found',
      });
    });

    it('delegates to replacePhoto when collaborator exists', async () => {
      const collaborator: any = { id: 'c-9', photo: null };
      repository.findOneBy.mockResolvedValue(collaborator);
      blobService.uploadFile.mockResolvedValue('admin-key.jpg');
      blobService.getFile.mockResolvedValue({
        buffer: 'b64',
        contentType: 'image/jpeg',
      });

      const file: any = {
        originalname: 'a.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('x'),
      };
      const result = await service.uploadImageByCollaboratorId(file, 'c-9');

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'c-9' });
      expect(blobService.uploadFile).toHaveBeenCalledWith(
        file,
        'docs-bucket',
        undefined,
        'collaborators',
      );
      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({ photo: 'admin-key.jpg' }),
      );
      expect(result).toBe('admin-key.jpg');
    });
  });

  describe('removeImageByCollaboratorId (admin)', () => {
    it('throws 404 when collaborator id is unknown', async () => {
      repository.findOneBy.mockResolvedValue(null);
      await expect(
        service.removeImageByCollaboratorId('missing-id'),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('deletes the blob, invalidates cache and clears the photo', async () => {
      const collaborator: any = { id: 'c-10', photo: 'collaborators/x.jpg' };
      repository.findOneBy.mockResolvedValue(collaborator);

      await expect(service.removeImageByCollaboratorId('c-10')).resolves.toBe(
        true,
      );

      expect(blobService.deleteFile).toHaveBeenCalledWith(
        'collaborators/x.jpg',
        'docs-bucket',
      );
      expect(cache.del).toHaveBeenCalledWith(
        'collaborator:photo:collaborators/x.jpg',
      );
      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c-10', photo: null }),
      );
    });

    it('is a no-op when the collaborator has no photo', async () => {
      repository.findOneBy.mockResolvedValue({ id: 'c-11', photo: null });
      await expect(service.removeImageByCollaboratorId('c-11')).resolves.toBe(
        true,
      );
      expect(blobService.deleteFile).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('getPhoto', () => {
    it('wraps cache with 30-day TTL', async () => {
      cache.wrap.mockResolvedValue({
        buffer: 'b64',
        contentType: 'image/jpeg',
      });
      await service.getPhoto('some-key.jpg');
      expect(cache.wrap).toHaveBeenCalledWith(
        'collaborator:photo:some-key.jpg',
        expect.any(Function),
        1000 * 60 * 60 * 24 * 30,
      );
    });
  });

  describe('cache da página pública do cursinho (tickets/025)', () => {
    const chave = 'cursinho:colaboradores:cursinho-A';

    it('ativar/desativar limpa a lista de colaboradores da página', async () => {
      repository.findOneParaAtivacao.mockResolvedValue({
        id: 'c-1',
        actived: false,
        partnerPrepCourse: { id: 'cursinho-A' },
        roleBeforeInactive: null,
        user: { id: 'u', role: null },
      });
      await service.changeActive('c-1', 'gestor');
      expect(repository.cursinhoDoColaborador).toHaveBeenCalledWith('c-1');
      expect(cache.del).toHaveBeenCalledWith(chave);
    });

    it('trocar a descrição também limpa', async () => {
      repository.findOneBy.mockResolvedValue({ id: 'c-1', description: '' });
      await service.changeDescription('c-1', 'gestor', 'Coordenação');
      expect(cache.del).toHaveBeenCalledWith(chave);
    });

    it('trocar a foto também limpa', async () => {
      repository.findOneByUserId.mockResolvedValue({ id: 'c-1', photo: null });
      blobService.uploadFile.mockResolvedValue('nova.jpg');
      blobService.getFile.mockResolvedValue({
        buffer: 'b',
        contentType: 'image/jpeg',
      });
      await service.uploadImage(
        {
          originalname: 'a.jpg',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('x'),
        } as never,
        'u',
      );
      expect(cache.del).toHaveBeenCalledWith(chave);
    });

    it('falha ao limpar o cache não derruba a ação', async () => {
      repository.findOneBy.mockResolvedValue({ id: 'c-1', description: '' });
      // 1ª chamada: escopo; 2ª: limpar o cache, que falha.
      repository.cursinhoDoColaborador
        .mockResolvedValueOnce('cursinho-A')
        .mockRejectedValueOnce(new Error('db'));
      await expect(
        service.changeDescription('c-1', 'gestor', 'x'),
      ).resolves.toBeDefined();
    });
  });

  describe('ativar e inativar (tickets-documentacao, card 02)', () => {
    const funcaoProfessor = {
      id: 'r-prof',
      name: 'Professor',
      gerenciarPermissoesCursinho: false,
      partnerPrepCourse: { id: 'cursinho-A' },
    };
    const funcaoAdmin = {
      ...funcaoProfessor,
      id: 'r-admin',
      name: 'Coordenação',
      gerenciarPermissoesCursinho: true,
    };
    const colaborador = (over: Record<string, unknown> = {}): any => ({
      id: 'c-1',
      actived: true,
      partnerPrepCourse: { id: 'cursinho-A' },
      roleBeforeInactive: null,
      user: {
        id: 'u-1',
        firstName: 'Ana',
        lastName: 'Lima',
        role: funcaoProfessor,
      },
      ...over,
    });
    const quemPedeNaoAdmin = () =>
      userRepository.findOneBy.mockResolvedValue({
        id: 'gestor',
        role: { gerenciarPermissoesCursinho: false },
      });
    const erro = async (p: Promise<unknown>) => {
      try {
        await p;
      } catch (e) {
        return e as HttpException;
      }
      throw new Error('não lançou');
    };

    it('inativar guarda a função e troca para aluno', async () => {
      const c = colaborador();
      repository.findOneParaAtivacao.mockResolvedValue(c);

      const r = await service.changeActive('c-1', 'gestor', false);

      expect(c.roleBeforeInactive).toBe(funcaoProfessor);
      expect(c.user.role).toEqual({ id: 'r-aluno', name: 'aluno' });
      expect(repository.update).toHaveBeenCalledWith(c);
      expect(userRepository.update).toHaveBeenCalledWith(c.user);
      expect(r).toEqual({
        id: 'c-1',
        actived: false,
        role: { id: 'r-aluno', name: 'aluno' },
        funcaoRestaurada: false,
      });
      expect(logPartnerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId: 'cursinho-A',
          description: 'Colaborador Ana Lima inativado',
        }),
      );
    });

    it('reativar devolve a função guardada e limpa a coluna', async () => {
      const c = colaborador({
        actived: false,
        roleBeforeInactive: funcaoProfessor,
        user: {
          id: 'u-1',
          firstName: 'Ana',
          lastName: 'Lima',
          role: { id: 'r-aluno', name: 'aluno' },
        },
      });
      repository.findOneParaAtivacao.mockResolvedValue(c);

      const r = await service.changeActive('c-1', 'gestor', true);

      expect(c.user.role).toBe(funcaoProfessor);
      expect(c.roleBeforeInactive).toBeNull();
      expect(r).toMatchObject({
        actived: true,
        role: { id: 'r-prof', name: 'Professor' },
        funcaoRestaurada: true,
      });
    });

    it('reativar sem função guardada (inativado antes desta versão) segue como aluno', async () => {
      const c = colaborador({
        actived: false,
        user: {
          id: 'u-1',
          firstName: 'Ana',
          lastName: 'Lima',
          role: { id: 'r-aluno', name: 'aluno' },
        },
      });
      repository.findOneParaAtivacao.mockResolvedValue(c);

      const r = await service.changeActive('c-1', 'gestor', true);

      expect(r).toMatchObject({ actived: true, funcaoRestaurada: false });
      expect(r.role).toEqual({ id: 'r-aluno', name: 'aluno' });
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('função guardada de fora do cursinho não volta', async () => {
      const c = colaborador({
        actived: false,
        roleBeforeInactive: { ...funcaoProfessor, partnerPrepCourse: null },
        user: {
          id: 'u-1',
          firstName: 'Ana',
          lastName: 'Lima',
          role: { id: 'r-aluno', name: 'aluno' },
        },
      });
      repository.findOneParaAtivacao.mockResolvedValue(c);

      const r = await service.changeActive('c-1', 'gestor', true);

      expect(r.funcaoRestaurada).toBe(false);
      expect(r.role?.name).toBe('aluno');
    });

    it('sem `actived` alterna (client antigo)', async () => {
      repository.findOneParaAtivacao.mockResolvedValue(colaborador());
      expect((await service.changeActive('c-1', 'gestor')).actived).toBe(false);
    });

    it('pedir o estado atual não muda nada', async () => {
      repository.findOneParaAtivacao.mockResolvedValue(colaborador());
      const r = await service.changeActive('c-1', 'gestor', true);
      expect(r.actived).toBe(true);
      expect(repository.update).not.toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();
      expect(logPartnerRepository.create).not.toHaveBeenCalled();
    });

    it('colaborador de outro cursinho → 403, sem gravar nada', async () => {
      repository.findOneParaAtivacao.mockResolvedValue(
        colaborador({ partnerPrepCourse: { id: 'cursinho-B' } }),
      );
      const e = await erro(service.changeActive('c-1', 'gestor', false));
      expect(e.getStatus()).toBe(403);
      expect(e.message).toBe('Esta pessoa não é colaboradora deste cursinho.');
      expect(repository.update).not.toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('colaborador inexistente → 404', async () => {
      repository.findOneParaAtivacao.mockResolvedValue(null);
      const e = await erro(service.changeActive('c-x', 'gestor', false));
      expect(e.getStatus()).toBe(404);
    });

    it('ninguém inativa a si mesmo, nem o admin → 403', async () => {
      repository.findOneParaAtivacao.mockResolvedValue(
        colaborador({
          user: {
            id: 'gestor',
            firstName: 'G',
            lastName: 'G',
            role: funcaoAdmin,
          },
        }),
      );
      const e = await erro(service.changeActive('c-1', 'gestor', false));
      expect(e.getStatus()).toBe(403);
      expect(e.message).toBe('Você não pode inativar o seu próprio cadastro.');
    });

    it('não-admin não inativa o admin do cursinho → 403', async () => {
      quemPedeNaoAdmin();
      repository.findOneParaAtivacao.mockResolvedValue(
        colaborador({
          user: { id: 'u-1', firstName: 'A', lastName: 'L', role: funcaoAdmin },
        }),
      );
      const e = await erro(service.changeActive('c-1', 'gestor', false));
      expect(e.getStatus()).toBe(403);
      expect(e.message).toBe(
        'Só o administrador do cursinho pode inativar ou reativar outro administrador.',
      );
    });

    it('não-admin não reativa quem volta como admin → 403', async () => {
      quemPedeNaoAdmin();
      repository.findOneParaAtivacao.mockResolvedValue(
        colaborador({
          actived: false,
          roleBeforeInactive: funcaoAdmin,
          user: {
            id: 'u-1',
            firstName: 'A',
            lastName: 'L',
            role: { id: 'r-aluno', name: 'aluno' },
          },
        }),
      );
      const e = await erro(service.changeActive('c-1', 'gestor', true));
      expect(e.getStatus()).toBe(403);
    });

    it('não-admin inativa e reativa colaborador comum', async () => {
      quemPedeNaoAdmin();
      const c = colaborador();
      repository.findOneParaAtivacao.mockResolvedValue(c);
      await service.changeActive('c-1', 'gestor', false);
      const r = await service.changeActive('c-1', 'gestor', true);
      expect(r).toMatchObject({ actived: true, funcaoRestaurada: true });
      expect(c.user.role).toBe(funcaoProfessor);
    });

    it('descrição de colaborador de outro cursinho → 404, sem gravar', async () => {
      repository.findOneBy.mockResolvedValue({ id: 'c-1', description: '' });
      repository.cursinhoDoColaborador.mockResolvedValue('cursinho-B');
      const e = await erro(service.changeDescription('c-1', 'gestor', 'x'));
      expect(e.getStatus()).toBe(404);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
