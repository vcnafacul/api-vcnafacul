import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { CollaboratorRepository } from '../../collaborator/collaborator.repository';
import { PartnerPrepCourseRepository } from '../partner-prep-course.repository';
import {
  AlertaEvasao,
  SalvarAlertaEvasaoDtoInput,
} from './dtos/alerta-evasao.dto';

/**
 * Configuração do alerta de risco de evasão do cursinho (tickets/054, card 01).
 *
 * ⚠️ O cursinho sai SEMPRE do colaborador logado — nunca do corpo nem da URL.
 */
@Injectable()
export class AlertaEvasaoService {
  private readonly logger = new Logger(AlertaEvasaoService.name);

  constructor(
    private readonly repository: PartnerPrepCourseRepository,
    private readonly collaboratorRepository: CollaboratorRepository,
  ) {}

  private async cursinhoDoUsuario(userId: string) {
    const colaborador =
      await this.collaboratorRepository.findOneByUserId(userId);
    if (!colaborador?.partnerPrepCourse || colaborador.actived === false) {
      throw new ForbiddenException(
        'Só colaboradores ativos de um cursinho configuram o alerta dele.',
      );
    }
    return colaborador.partnerPrepCourse;
  }

  async obter(userId: string): Promise<AlertaEvasao> {
    const cursinho = await this.cursinhoDoUsuario(userId);
    return {
      percentual: cursinho.alertaEvasaoPercentual ?? null,
      minimoDeAulas: cursinho.alertaEvasaoMinimoAulas,
    };
  }

  async salvar(
    userId: string,
    dto: SalvarAlertaEvasaoDtoInput,
  ): Promise<AlertaEvasao> {
    const cursinho = await this.cursinhoDoUsuario(userId);
    await this.repository.salvarAlertaEvasao(cursinho.id, {
      alertaEvasaoPercentual: dto.percentual,
      alertaEvasaoMinimoAulas: dto.minimoDeAulas,
    });
    this.logger.log(
      `alerta de evasão do cursinho ${cursinho.id} por ${userId}: ` +
        `${dto.percentual ?? 'desligado'}% após ${dto.minimoDeAulas} aulas`,
    );
    return { percentual: dto.percentual, minimoDeAulas: dto.minimoDeAulas };
  }
}
