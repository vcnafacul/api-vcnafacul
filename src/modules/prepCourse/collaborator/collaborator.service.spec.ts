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
    update: jest.Mock;
  };

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
      update: jest.fn(),
      cursinhoDoColaborador: jest.fn().mockResolvedValue('cursinho-A'),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CollaboratorService,
        { provide: CollaboratorRepository, useValue: repository },
        { provide: PartnerPrepCourseService, useValue: {} },
        {
          provide: EnvService,
          useValue: {
            get: (k: string) => (k === 'BUCKET_DOC' ? 'docs-bucket' : ''),
          },
        },
        { provide: RoleRepository, useValue: {} },
        { provide: UserRepository, useValue: {} },
        { provide: 'BlobService', useValue: blobService },
        { provide: CacheService, useValue: cache },
        { provide: CollaboratorFrenteRepository, useValue: {} },
        { provide: FrenteProxyService, useValue: {} },
        { provide: MateriaProxyService, useValue: {} },
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
      repository.findOneBy.mockResolvedValue({
        id: 'c-1',
        actived: false,
        user: { id: 'u' },
      });
      await service.changeActive('c-1');
      expect(repository.cursinhoDoColaborador).toHaveBeenCalledWith('c-1');
      expect(cache.del).toHaveBeenCalledWith(chave);
    });

    it('trocar a descrição também limpa', async () => {
      repository.findOneBy.mockResolvedValue({ id: 'c-1', description: '' });
      await service.changeDescription('c-1', 'Coordenação');
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
      repository.cursinhoDoColaborador.mockRejectedValue(new Error('db'));
      await expect(
        service.changeDescription('c-1', 'x'),
      ).resolves.toBeDefined();
    });
  });
});
