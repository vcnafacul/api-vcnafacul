import { ForbiddenException, Injectable } from '@nestjs/common';
import { CollaboratorRepository } from 'src/modules/prepCourse/collaborator/collaborator.repository';

@Injectable()
export class CursinhoResolverService {
  constructor(
    private readonly collaboratorRepository: CollaboratorRepository,
  ) {}

  async resolveCursinhoIdByUserId(userId: string): Promise<string> {
    const collab =
      await this.collaboratorRepository.findActiveByUserIdWithPrep(userId);
    if (!collab || !collab.partnerPrepCourse) {
      throw new ForbiddenException('Usuário não vinculado a nenhum cursinho');
    }
    return collab.partnerPrepCourse.id;
  }
}
