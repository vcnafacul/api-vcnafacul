import { Injectable, Logger } from '@nestjs/common';
import { CentralRepository } from 'src/modules/push/central/central.repository';
import { PushPayload } from 'src/modules/push/push.regras';
import { PushService } from 'src/modules/push/push.service';

const LINK = '/dashboard/acompanhamento-inscricoes';
const corta = (t: string, max: number) =>
  t.length <= max ? t : `${t.slice(0, max - 1)}…`;

export function textoDaInscricao(
  cursinho: string | undefined,
  studentCourseId: string,
): PushPayload {
  return {
    title: corta(`✅ Inscrição recebida: ${cursinho || 'Cursinho'}`, 100),
    body: 'Sua inscrição foi feita com sucesso. Enviamos para o seu email uma cópia do formulário preenchido.',
    url: LINK,
    tag: `inscricao-processo-${studentCourseId}`,
  };
}

/**
 * Aviso de inscrição concluída no processo seletivo (tickets-documentacao,
 * card 01): vai para a central do app e, para quem ativou, como push.
 *
 * ⚠️ Nunca derruba a inscrição: falha (ou push desligado — só existe em prod)
 * vira log. Processo de teste também avisa, para refletir a experiência real.
 */
@Injectable()
export class PushDaInscricaoService {
  private readonly logger = new Logger(PushDaInscricaoService.name);

  constructor(
    private readonly push: PushService,
    private readonly central: CentralRepository,
  ) {}

  private habilitado(): boolean {
    try {
      this.push.garantirHabilitado();
      return true;
    } catch {
      return false;
    }
  }

  async avisar(
    userId: string,
    cursinho: string | undefined,
    studentCourseId: string,
  ): Promise<void> {
    const texto = textoDaInscricao(cursinho, studentCourseId);
    await Promise.all([
      this.central
        .gravar([userId], {
          titulo: texto.title,
          corpo: texto.body,
          url: texto.url ?? null,
        })
        .catch((err) =>
          this.logger.error(
            `Central: inscrição ${studentCourseId} não gravou`,
            err,
          ),
        ),
      this.habilitado()
        ? this.push
            .sendToUsers([userId], texto)
            .catch((err) =>
              this.logger.warn(
                `Push da inscrição ${studentCourseId} não saiu: ${err}`,
              ),
            )
        : undefined,
    ]);
  }
}
