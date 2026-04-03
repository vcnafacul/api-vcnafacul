import { HttpException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockStudentCourseRepo: any;
  let mockStudentAttendanceRepo: any;
  let mockCollaboratorRepository: any;
  let mockCollaboratorFrenteRepository: any;
  let mockFrenteProxyService: any;
  let mockQuestaoService: any;
  let mockCacheService: any;

  beforeEach(() => {
    mockStudentCourseRepo = {
      findAllEnrolledWithDetails: jest.fn(),
    };
    mockStudentAttendanceRepo = {
      countByStudentCourseId: jest.fn(),
    };
    mockCollaboratorRepository = {
      findActiveByUserIdWithDetails: jest.fn(),
    };
    mockCollaboratorFrenteRepository = {
      findByCollaboratorId: jest.fn(),
    };
    mockFrenteProxyService = {
      getById: jest.fn(),
    };
    mockQuestaoService = {
      getPendingByMateria: jest.fn(),
    };
    mockCacheService = {
      wrap: jest.fn().mockImplementation((_key, fn) => fn()),
      del: jest.fn().mockResolvedValue(undefined),
    };

    service = new DashboardService(
      mockStudentCourseRepo as any,
      mockStudentAttendanceRepo as any,
      mockCollaboratorRepository as any,
      mockCollaboratorFrenteRepository as any,
      mockFrenteProxyService as any,
      mockQuestaoService as any,
      mockCacheService as any,
    );
  });

  describe('getStudentDashboard', () => {
    it('should return student dashboard data as array', async () => {
      mockStudentCourseRepo.findAllEnrolledWithDetails.mockResolvedValue([
        {
          id: 'sc-1',
          cod_enrolled: 'MAT-001',
          partnerPrepCourse: {
            thumbnail: Buffer.from('img'),
            geo: { name: 'Cursinho ABC' },
          },
          class: {
            name: 'Turma A',
            coursePeriod: { name: '1º Semestre', year: 2026 },
          },
        },
      ]);
      mockStudentAttendanceRepo.countByStudentCourseId.mockResolvedValue({
        presencas: 18,
        faltas: 2,
      });

      const result = await service.getStudentDashboard('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].cursinho.name).toBe('Cursinho ABC');
      expect(result[0].matricula).toBe('MAT-001');
      expect(result[0].frequencia.percentual).toBe(90);
    });

    it('should return empty array when no enrollments', async () => {
      mockStudentCourseRepo.findAllEnrolledWithDetails.mockResolvedValue([]);

      const result = await service.getStudentDashboard('user-1');

      expect(result).toEqual([]);
    });

    it('should return multiple enrollments', async () => {
      mockStudentCourseRepo.findAllEnrolledWithDetails.mockResolvedValue([
        {
          id: 'sc-1',
          cod_enrolled: 'MAT-001',
          partnerPrepCourse: { logo: null, geo: { name: 'Cursinho A' } },
          class: null,
        },
        {
          id: 'sc-2',
          cod_enrolled: 'MAT-002',
          partnerPrepCourse: { logo: null, geo: { name: 'Cursinho B' } },
          class: { name: 'Turma X', coursePeriod: { name: '2º Sem', year: 2026 } },
        },
      ]);
      mockStudentAttendanceRepo.countByStudentCourseId
        .mockResolvedValueOnce({ presencas: 10, faltas: 0 })
        .mockResolvedValueOnce({ presencas: 5, faltas: 5 });

      const result = await service.getStudentDashboard('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].cursinho.name).toBe('Cursinho A');
      expect(result[0].frequencia.percentual).toBe(100);
      expect(result[1].cursinho.name).toBe('Cursinho B');
      expect(result[1].frequencia.percentual).toBe(50);
    });
  });

  describe('getCollaboratorDashboard', () => {
    it('should return collaborator dashboard data with frentes', async () => {
      const thumbnailBuffer = Buffer.from('fake-image');
      mockCollaboratorRepository.findActiveByUserIdWithDetails.mockResolvedValue(
        {
          id: 'col-1',
          partnerPrepCourse: {
            thumbnail: thumbnailBuffer,
            geo: { name: 'Cursinho XYZ' },
          },
        },
      );
      mockCollaboratorFrenteRepository.findByCollaboratorId.mockResolvedValue([
        { frenteId: 'frente-1', collaboratorId: 'col-1' },
        { frenteId: 'frente-2', collaboratorId: 'col-1' },
      ]);
      mockFrenteProxyService.getById
        .mockResolvedValueOnce({ _id: 'frente-1', nome: 'Matemática' })
        .mockResolvedValueOnce({ _id: 'frente-2', nome: 'Física' });

      const result = await service.getCollaboratorDashboard('user-1');

      expect(result.cursinho.name).toBe('Cursinho XYZ');
      expect(result.cursinho.logo).toBe(
        `data:image/webp;base64,${thumbnailBuffer.toString('base64')}`,
      );
      expect(result.frentes).toHaveLength(2);
      expect(result.frentes[0]).toEqual({ id: 'frente-1', name: 'Matemática' });
      expect(result.frentes[1]).toEqual({ id: 'frente-2', name: 'Física' });
    });

    it('should throw 404 when collaborator not found', async () => {
      mockCollaboratorRepository.findActiveByUserIdWithDetails.mockResolvedValue(
        null,
      );

      await expect(
        service.getCollaboratorDashboard('user-1'),
      ).rejects.toThrow(HttpException);
    });

    it('should return empty frentes list when no frentes assigned', async () => {
      mockCollaboratorRepository.findActiveByUserIdWithDetails.mockResolvedValue(
        {
          id: 'col-1',
          partnerPrepCourse: {
            logo: null,
            geo: { name: 'Cursinho ABC' },
          },
        },
      );
      mockCollaboratorFrenteRepository.findByCollaboratorId.mockResolvedValue(
        [],
      );

      const result = await service.getCollaboratorDashboard('user-1');

      expect(result.frentes).toHaveLength(0);
      expect(result.cursinho.name).toBe('Cursinho ABC');
      expect(result.cursinho.logo).toBeNull();
    });

    it('should skip frentes that fail to resolve from ms-simulado', async () => {
      mockCollaboratorRepository.findActiveByUserIdWithDetails.mockResolvedValue(
        {
          id: 'col-1',
          partnerPrepCourse: {
            logo: null,
            geo: { name: 'Cursinho ABC' },
          },
        },
      );
      mockCollaboratorFrenteRepository.findByCollaboratorId.mockResolvedValue([
        { frenteId: 'frente-1', collaboratorId: 'col-1' },
        { frenteId: 'frente-bad', collaboratorId: 'col-1' },
      ]);
      mockFrenteProxyService.getById
        .mockResolvedValueOnce({ _id: 'frente-1', nome: 'Química' })
        .mockRejectedValueOnce(new Error('Not found'));

      const result = await service.getCollaboratorDashboard('user-1');

      expect(result.frentes).toHaveLength(1);
      expect(result.frentes[0]).toEqual({ id: 'frente-1', name: 'Química' });
    });
  });

  describe('getQuestoesPendentes', () => {
    it('should return pending questions filtered by collaborator frentes', async () => {
      mockCollaboratorRepository.findActiveByUserId = jest
        .fn()
        .mockResolvedValue({ id: 'col-1' });
      mockCollaboratorFrenteRepository.findByCollaboratorId.mockResolvedValue([
        { frenteId: 'frente-1', collaboratorId: 'col-1' },
      ]);
      mockFrenteProxyService.getById.mockResolvedValue({
        _id: 'frente-1',
        materia: 'materia-1',
      });
      mockQuestaoService.getPendingByMateria.mockResolvedValue({
        total: 5,
        questoes: [],
      });

      const result = await service.getQuestoesPendentes('user-1');

      expect(mockQuestaoService.getPendingByMateria).toHaveBeenCalledWith([
        'materia-1',
      ]);
      expect(result).toEqual({ total: 5, questoes: [] });
    });

    it('should return all pending questions when user is not a collaborator', async () => {
      mockCollaboratorRepository.findActiveByUserId = jest
        .fn()
        .mockResolvedValue(null);
      mockQuestaoService.getPendingByMateria.mockResolvedValue({
        total: 10,
        questoes: [],
      });

      const result = await service.getQuestoesPendentes('user-1');

      expect(mockQuestaoService.getPendingByMateria).toHaveBeenCalledWith(
        undefined,
      );
      expect(result).toEqual({ total: 10, questoes: [] });
    });

    it('should return all pending when collaborator has no frentes', async () => {
      mockCollaboratorRepository.findActiveByUserId = jest
        .fn()
        .mockResolvedValue({ id: 'col-1' });
      mockCollaboratorFrenteRepository.findByCollaboratorId.mockResolvedValue(
        [],
      );
      mockQuestaoService.getPendingByMateria.mockResolvedValue({
        total: 3,
        questoes: [],
      });

      const result = await service.getQuestoesPendentes('user-1');

      expect(mockQuestaoService.getPendingByMateria).toHaveBeenCalledWith(
        undefined,
      );
      expect(result).toEqual({ total: 3, questoes: [] });
    });

    it('should skip frentes that fail to resolve materia', async () => {
      mockCollaboratorRepository.findActiveByUserId = jest
        .fn()
        .mockResolvedValue({ id: 'col-1' });
      mockCollaboratorFrenteRepository.findByCollaboratorId.mockResolvedValue([
        { frenteId: 'frente-1', collaboratorId: 'col-1' },
        { frenteId: 'frente-bad', collaboratorId: 'col-1' },
      ]);
      mockFrenteProxyService.getById
        .mockResolvedValueOnce({ _id: 'frente-1', materia: 'materia-1' })
        .mockRejectedValueOnce(new Error('Not found'));
      mockQuestaoService.getPendingByMateria.mockResolvedValue({
        total: 2,
        questoes: [],
      });

      const result = await service.getQuestoesPendentes('user-1');

      expect(mockQuestaoService.getPendingByMateria).toHaveBeenCalledWith([
        'materia-1',
      ]);
      expect(result).toEqual({ total: 2, questoes: [] });
    });
  });

  describe('invalidateStudentDashboard', () => {
    it('should delete student dashboard cache', async () => {
      await service.invalidateStudentDashboard('user-1');
      expect(mockCacheService.del).toHaveBeenCalledWith(
        'dashboard:student:user-1',
      );
    });
  });

  describe('invalidateCollaboratorDashboard', () => {
    it('should delete collaborator dashboard cache', async () => {
      await service.invalidateCollaboratorDashboard('user-1');
      expect(mockCacheService.del).toHaveBeenCalledWith(
        'dashboard:collab:user-1',
      );
    });
  });
});
