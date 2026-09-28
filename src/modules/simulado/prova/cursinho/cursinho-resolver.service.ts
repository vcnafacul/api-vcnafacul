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

  /**
   * Como o de cima, mas devolve `null` em vez de 403 (tickets/023, card 02):
   * o ator do banco de questões pode ser admin sem cursinho.
   */
  async resolveCursinhoIdOuNull(userId: string): Promise<string | null> {
    const collab =
      await this.collaboratorRepository.findActiveByUserIdWithPrep(userId);
    return collab?.partnerPrepCourse?.id ?? null;
  }
}
