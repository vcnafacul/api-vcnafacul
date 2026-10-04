import { HttpException, NotFoundException } from '@nestjs/common';
import { CoursePeriodService } from './course-period.service';
import { CoursePeriodRepository } from './course-period.repository';
import { PartnerPrepCourseRepository } from '../partnerPrepCourse/partner-prep-course.repository';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { StatusApplication } from '../studentCourse/enums/stastusApplication';
import { LogStudent } from '../studentCourse/log-student/log-student.entity';
import { StudentCourse } from '../studentCourse/student-course.entity';

describe('CoursePeriodService', () => {
  let service: CoursePeriodService;
  let repository: jest.Mocked<CoursePeriodRepository>;
  let partnerRepository: jest.Mocked<PartnerPrepCourseRepository>;
  let manager: { update: jest.Mock; save: jest.Mock; create: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let discordWebhook: jest.Mocked<DiscordWebhook>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findOneById: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAllBy: jest.fn(),
      findExpiredPeriods: jest.fn(),
    } as any;

    partnerRepository = {
      findOneByUserId: jest.fn(),
    } as any;

    manager = {
      update: jest.fn(),
      save: jest.fn(),
      create: jest.fn((_entity, dados) => dados),
    };
    dataSource = {
      transaction: jest.fn((cb) => cb(manager)),
    };

    discordWebhook = {
      sendMessage: jest.fn(),
    } as any;

    service = new CoursePeriodService(
      repository,
      partnerRepository,
      discordWebhook,
      dataSource as any,
    );
  });

  describe('create', () => {
    it('should create a course period', async () => {
      const partner = { id: 'partner-1' };
      partnerRepository.findOneByUserId.mockResolvedValue(partner as any);
      repository.create.mockResolvedValue({
        id: 'cp-1',
        name: 'Período 1',
        year: 2026,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
        partnerPrepCourse: partner,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.create(
        {
          name: 'Período 1',
          startDate: '2026-01-01' as any,
          endDate: '2026-06-30' as any,
        } as any,
        'user-1',
      );

      expect(result.name).toBe('Período 1');
      expect(result.partnerPrepCourseId).toBe('partner-1');
    });

    it('should throw when partner not found', async () => {
      partnerRepository.findOneByUserId.mockResolvedValue(null);

      await expect(
        service.create(
          { startDate: '2026-01-01', endDate: '2026-06-30' } as any,
          'user-1',
        ),
      ).rejects.toThrow(HttpException);
    });

    it('should throw when startDate >= endDate', async () => {
      partnerRepository.findOneByUserId.mockResolvedValue({ id: 'p1' } as any);

      await expect(
        service.create(
          { name: 'P', startDate: '2026-06-30', endDate: '2026-01-01' } as any,
          'user-1',
        ),
      ).rejects.toThrow('A data de início deve ser anterior à data de fim');
    });
  });

  describe('update', () => {
    const doCursinho = () => {
      partnerRepository.findOneByUserId.mockResolvedValue({ id: 'p1' } as any);
      repository.findOneById.mockResolvedValue({
        id: 'cp-1',
        partnerPrepCourse: { id: 'p1' },
      } as any);
    };

    it('should update a course period', async () => {
      doCursinho();
      repository.findOneBy.mockResolvedValue({
        id: 'cp-1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
      } as any);

      await service.update({ id: 'cp-1', name: 'Updated' } as any, 'u1');

      expect(repository.update).toHaveBeenCalled();
    });

    it('should throw when course period not found', async () => {
      partnerRepository.findOneByUserId.mockResolvedValue({ id: 'p1' } as any);
      repository.findOneById.mockResolvedValue(null);

      await expect(
        service.update({ id: 'bad-id' } as any, 'u1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('⚠️ período de OUTRO cursinho: 404 e não altera', async () => {
      partnerRepository.findOneByUserId.mockResolvedValue({ id: 'p1' } as any);
      repository.findOneById.mockResolvedValue({
        id: 'cp-9',
        partnerPrepCourse: { id: 'outro' },
      } as any);

      await expect(
        service.update({ id: 'cp-9', name: 'x' } as any, 'u1'),
      ).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should validate dates when updating', async () => {
      doCursinho();
      repository.findOneBy.mockResolvedValue({
        id: 'cp-1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
      } as any);

      await expect(
        service.update(
          {
            id: 'cp-1',
            startDate: '2026-12-01',
            endDate: '2026-01-01',
          } as any,
          'u1',
        ),
      ).rejects.toThrow('A data de início deve ser anterior à data de fim');
    });
  });

  describe('excluirDoCursinho', () => {
    beforeEach(() => {
      partnerRepository.findOneByUserId.mockResolvedValue({ id: 'p1' } as any);
    });

    it('should delete a course period without classes', async () => {
      repository.findOneById.mockResolvedValue({
        id: 'cp-1',
        partnerPrepCourse: { id: 'p1' },
        classes: [],
      } as any);

      await service.excluirDoCursinho('cp-1', 'u1');
      expect(repository.delete).toHaveBeenCalledWith('cp-1');
    });

    it('should throw when course period not found', async () => {
      repository.findOneById.mockResolvedValue(null);

      await expect(service.excluirDoCursinho('bad-id', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('⚠️ período de OUTRO cursinho: 404 e não exclui', async () => {
      repository.findOneById.mockResolvedValue({
        id: 'cp-9',
        partnerPrepCourse: { id: 'outro' },
        classes: [],
      } as any);

      await expect(service.excluirDoCursinho('cp-9', 'u1')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should throw when course period has classes', async () => {
      repository.findOneById.mockResolvedValue({
        id: 'cp-1',
        partnerPrepCourse: { id: 'p1' },
        classes: [{ id: 'class-1' }],
      } as any);

      await expect(service.excluirDoCursinho('cp-1', 'u1')).rejects.toThrow(
        'Não é possível excluir um período que tem turmas',
      );
    });
  });

  describe('closeExpiredCoursePeriods', () => {
    it('should do nothing when no expired periods', async () => {
      repository.findExpiredPeriods.mockResolvedValue([]);

      await service.closeExpiredCoursePeriods();

      expect(manager.update).not.toHaveBeenCalled();
    });

    it('should update students and send discord messages', async () => {
      repository.findExpiredPeriods.mockResolvedValue([
        {
          name: 'Período 2025',
          year: 2025,
          classes: [
            {
              students: [
                { id: 's1', applicationStatus: StatusApplication.Enrolled },
                { id: 's2', applicationStatus: StatusApplication.Enrolled },
              ],
            },
          ],
        },
      ] as any);

      await service.closeExpiredCoursePeriods();

      expect(manager.update).toHaveBeenCalledWith(
        StudentCourse,
        { id: expect.objectContaining({ _value: ['s1', 's2'] }) },
        expect.objectContaining({
          applicationStatus: StatusApplication.EnrollmentClosed,
        }),
      );
      // um log por estudante, explicando o encerramento
      expect(manager.save).toHaveBeenCalledWith(LogStudent, [
        {
          studentId: 's1',
          applicationStatus: StatusApplication.EnrollmentClosed,
          description:
            'Matrícula encerrada pelo fim do período letivo "Período 2025" (2025)',
        },
        expect.objectContaining({ studentId: 's2' }),
      ]);
      expect(discordWebhook.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('should skip students already with EnrollmentClosed status', async () => {
      repository.findExpiredPeriods.mockResolvedValue([
        {
          name: 'P1',
          year: 2025,
          classes: [
            {
              students: [
                {
                  id: 's1',
                  applicationStatus: StatusApplication.EnrollmentClosed,
                },
                { id: 's2', applicationStatus: StatusApplication.Enrolled },
              ],
            },
          ],
        },
      ] as any);

      await service.closeExpiredCoursePeriods();

      expect(manager.update).toHaveBeenCalledWith(
        StudentCourse,
        { id: expect.objectContaining({ _value: ['s2'] }) },
        expect.anything(),
      );
    });

    it('⚠️ não encerra matrícula cancelada (nem outro status que não Matriculado)', async () => {
      repository.findExpiredPeriods.mockResolvedValue([
        {
          name: 'P1',
          year: 2025,
          classes: [
            {
              students: [
                {
                  id: 'cancelado',
                  applicationStatus: StatusApplication.EnrollmentCancelled,
                },
                {
                  id: 'nao-confirmado',
                  applicationStatus: StatusApplication.EnrollmentNotConfirmed,
                },
                {
                  id: 'apagado',
                  applicationStatus: StatusApplication.Enrolled,
                  deletedAt: new Date(),
                },
                { id: 's2', applicationStatus: StatusApplication.Enrolled },
              ],
            },
          ],
        },
      ] as any);

      await service.closeExpiredCoursePeriods();

      expect(manager.update).toHaveBeenCalledTimes(1);
      expect(manager.update.mock.calls[0][1].id._value).toEqual(['s2']);
    });

    it('should handle errors and send discord error message', async () => {
      repository.findExpiredPeriods.mockRejectedValue(
        new Error('DB connection failed'),
      );

      await service.closeExpiredCoursePeriods();

      expect(discordWebhook.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('DB connection failed'),
      );
    });

    it('should handle periods with no students needing update', async () => {
      repository.findExpiredPeriods.mockResolvedValue([
        {
          name: 'P1',
          year: 2025,
          classes: [
            {
              students: [
                {
                  id: 's1',
                  applicationStatus: StatusApplication.EnrollmentClosed,
                },
              ],
            },
          ],
        },
      ] as any);

      await service.closeExpiredCoursePeriods();

      expect(manager.update).not.toHaveBeenCalled();
    });
  });
});
