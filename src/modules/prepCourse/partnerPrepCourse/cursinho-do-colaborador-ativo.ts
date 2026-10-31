import { ForbiddenException } from '@nestjs/common';
import { CollaboratorRepository } from '../collaborator/collaborator.repository';

/**
 * O cursinho do colaborador **ativo** logado — a página do cursinho
 * (tickets/025) e o alerta de evasão (tickets/054) resolvem por aqui.
 *
 * ⚠️ O cursinho sai SEMPRE do colaborador logado — nunca do corpo nem da URL.
 * Sem colaborador, desligado ou sem cursinho → 403 com a `mensagem`.
 */
export async function cursinhoDoColaboradorAtivo(
  collaboratorRepository: CollaboratorRepository,
  userId: string,
  mensagem: string,
) {
  const colaborador =
    await collaboratorRepository.findOneByUserIdWithGeo(userId);
  if (!colaborador?.partnerPrepCourse || colaborador.actived === false) {
    throw new ForbiddenException(mensagem);
  }
  return colaborador.partnerPrepCourse;
}
