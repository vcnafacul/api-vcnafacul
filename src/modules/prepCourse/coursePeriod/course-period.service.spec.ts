import { HttpException } from '@nestjs/common';
import { CoursePeriodService } from './course-period.service';
import { CoursePeriodRepository } from './course-period.repository';
import { PartnerPrepCourseRepository } from '../partnerPrepCourse/partner-prep-course.repository';
import { StudentCourseRepository } from '../studentCourse/student-course.repository';
import { DiscordWebhook } from 'src/shared/services/webhooks/discord';
import { StatusApplication } from '../studentCourse/enums/stastusApplication';

describe('CoursePeriodService', () => {
  let service: CoursePeriodService;
  let repository: jest.Mocked<CoursePeriodRepository>;
  let partnerRepository: jest.Mocked<PartnerPrepCourseRepository>;
  let studentCourseRepository: jest.Mocked<StudentCourseRepository>;
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

    studentCourseRepository = {
      updateStudentStatus: jest.fn(),
    } as any;

    discordWebhook = {
      sendMessage: jest.fn(),
    } as any;

    service = new CoursePeriodService(
      repository,
      partnerRepository,
      studentCourseRepository,
      discordWebhook,
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
      ).rejects.toThrow('Start date must be before end date');
    });
  });

  describe('update', () => {
    it('should update a course period', async () => {
      repository.findOneBy.mockResolvedValue({
        id: 'cp-1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
      } as any);

      await service.update({
        id: 'cp-1',
        name: 'Updated',
      } as any);

      expect(repository.update).toHaveBeenCalled();
    });

    it('should throw when course period not found', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.update({ id: 'bad-id' } as any)).rejects.toThrow(
        HttpException,
      );
    });

    it('should validate dates when updating', async () => {
      repository.findOneBy.mockResolvedValue({
        id: 'cp-1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
      } as any);

      await expect(
        service.update({
          id: 'cp-1',
          startDate: '2026-12-01',
          endDate: '2026-01-01',
        } as any),
      ).rejects.toThrow('Start date must be before end date');
    });
  });

  describe('delete', () => {
    it('should delete a course period without classes', async () => {
      repository.findOneById.mockResolvedValue({
        id: 'cp-1',
        classes: [],
      } as any);

      await service.delete('cp-1');
      expect(repository.delete).toHaveBeenCalledWith('cp-1');
    });

    it('should throw when course period not found', async () => {
      repository.findOneById.mockResolvedValue(null);

      await expect(service.delete('bad-id')).rejects.toThrow(HttpException);
    });

    it('should throw when course period has classes', async () => {
      repository.findOneById.mockResolvedValue({
        id: 'cp-1',
        classes: [{ id: 'class-1' }],
      } as any);

      await expect(service.delete('cp-1')).rejects.toThrow(
        'has classes, cannot be deleted',
      );
    });
  });

  describe('closeExpiredCoursePeriods', () => {
    it('should do nothing when no expired periods', async () => {
      repository.findExpiredPeriods.mockResolvedValue([]);

      await service.closeExpiredCoursePeriods();

      expect(
        studentCourseRepository.updateStudentStatus,
      ).not.toHaveBeenCalled();
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

      expect(studentCourseRepository.updateStudentStatus).toHaveBeenCalledWith(
        ['s1', 's2'],
        StatusApplication.EnrollmentClosed,
      );
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

      expect(studentCourseRepository.updateStudentStatus).toHaveBeenCalledWith(
        ['s2'],
        StatusApplication.EnrollmentClosed,
      );
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

      expect(
        studentCourseRepository.updateStudentStatus,
      ).not.toHaveBeenCalled();
    });
  });
});
