import { Inject, Injectable } from '@nestjs/common';
import { Profile } from '../enums/profile.enum';

export const STUDENT_COURSE_REPO_TOKEN = 'STUDENT_COURSE_REPO_TOKEN';
export const COLLABORATOR_REPO_TOKEN = 'COLLABORATOR_REPO_TOKEN';

export interface IStudentCourseRepo {
  findEnrolledByUserId(userId: string): Promise<{ id: string } | null>;
}

export interface ICollaboratorRepo {
  findActiveByUserId(userId: string): Promise<{ id: string } | null>;
}

@Injectable()
export class ProfileDetectorService {
  constructor(
    @Inject(STUDENT_COURSE_REPO_TOKEN)
    private readonly studentCourseRepo: IStudentCourseRepo,
    @Inject(COLLABORATOR_REPO_TOKEN)
    private readonly collaboratorRepo: ICollaboratorRepo,
  ) {}

  async detect(userId: string): Promise<Profile[]> {
    const profiles: Profile[] = [Profile.Common];

    const [enrolled, collaborator] = await Promise.all([
      this.studentCourseRepo.findEnrolledByUserId(userId),
      this.collaboratorRepo.findActiveByUserId(userId),
    ]);

    if (enrolled) profiles.push(Profile.Student);
    if (collaborator) profiles.push(Profile.Collaborator);

    return profiles;
  }
}
