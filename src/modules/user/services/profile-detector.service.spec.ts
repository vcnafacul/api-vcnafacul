import {
  ProfileDetectorService,
  STUDENT_COURSE_REPO_TOKEN,
  COLLABORATOR_REPO_TOKEN,
} from './profile-detector.service';
import { Profile } from '../enums/profile.enum';

describe('ProfileDetectorService', () => {
  let service: ProfileDetectorService;
  let mockStudentCourseRepo: any;
  let mockCollaboratorRepo: any;

  beforeEach(() => {
    mockStudentCourseRepo = {
      findEnrolledByUserId: jest.fn(),
    };
    mockCollaboratorRepo = {
      findActiveByUserId: jest.fn(),
    };

    service = new ProfileDetectorService(
      mockStudentCourseRepo,
      mockCollaboratorRepo,
    );
  });

  it('should always include common', async () => {
    mockStudentCourseRepo.findEnrolledByUserId.mockResolvedValue(null);
    mockCollaboratorRepo.findActiveByUserId.mockResolvedValue(null);
    const profiles = await service.detect('user-1');
    expect(profiles).toEqual([Profile.Common]);
  });

  it('should include student when enrolled', async () => {
    mockStudentCourseRepo.findEnrolledByUserId.mockResolvedValue({
      id: 'sc-1',
    });
    mockCollaboratorRepo.findActiveByUserId.mockResolvedValue(null);
    const profiles = await service.detect('user-1');
    expect(profiles).toContain(Profile.Student);
    expect(profiles).toContain(Profile.Common);
  });

  it('should include collaborator when active', async () => {
    mockStudentCourseRepo.findEnrolledByUserId.mockResolvedValue(null);
    mockCollaboratorRepo.findActiveByUserId.mockResolvedValue({
      id: 'c-1',
      actived: true,
    });
    const profiles = await service.detect('user-1');
    expect(profiles).toContain(Profile.Collaborator);
    expect(profiles).toContain(Profile.Common);
  });

  it('should include both student and collaborator', async () => {
    mockStudentCourseRepo.findEnrolledByUserId.mockResolvedValue({
      id: 'sc-1',
    });
    mockCollaboratorRepo.findActiveByUserId.mockResolvedValue({
      id: 'c-1',
      actived: true,
    });
    const profiles = await service.detect('user-1');
    expect(profiles).toEqual(
      expect.arrayContaining([
        Profile.Common,
        Profile.Student,
        Profile.Collaborator,
      ]),
    );
  });

  // Export tokens so they are accessible for module registration
  it('should export injection tokens', () => {
    expect(STUDENT_COURSE_REPO_TOKEN).toBe('STUDENT_COURSE_REPO_TOKEN');
    expect(COLLABORATOR_REPO_TOKEN).toBe('COLLABORATOR_REPO_TOKEN');
  });
});
