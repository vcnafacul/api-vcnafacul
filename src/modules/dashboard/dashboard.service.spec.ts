import { HttpException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockStudentCourseRepo: any;
  let mockStudentAttendanceRepo: any;
  let mockCollaboratorRepository: any;
  let mockCollaboratorFrenteRepository: any;
  let mockFrenteProxyService: any;

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

    service = new DashboardService(
      mockStudentCourseRepo as any,
      mockStudentAttendanceRepo as any,
      mockCollaboratorRepository as any,
      mockCollaboratorFrenteRepository as any,
      mockFrenteProxyService as any,
    );
  });

  describe('getStudentDashboard', () => {
    it('should return student dashboard data as array', async () => {
      mockStudentCourseRepo.findAllEnrolledWithDetails.mockResolvedValue([
        {
          id: 'sc-1',
          cod_enrolled: 'MAT-001',
          partnerPrepCourse: {
            logo: 'logo.png',
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
      mockCollaboratorRepository.findActiveByUserIdWithDetails.mockResolvedValue(
        {
          id: 'col-1',
          partnerPrepCourse: {
            logo: 'logo.png',
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
      expect(result.cursinho.logo).toBe('logo.png');
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
});
