import { Injectable, Logger } from '@nestjs/common';
import { PushPayload } from 'src/modules/push/push.regras';
import { PushService } from 'src/modules/push/push.service';
import { StudentCourseRepository } from '../studentCourse/student-course.repository';
import { EventoSimulado } from './evento-simulado.entity';
import type { ResultadoDaInscricao } from './inscricao-do-aluno.service';

const LINK = '/dashboard';
const corta = (t: string, max: number) =>
  t.length <= max ? t : `${t.slice(0, max - 1)}…`;

export function textoDaAbertura(evento: EventoSimulado): PushPayload {
  const cursinho = evento.partnerPrepCourse?.geo?.name || 'Seu cursinho';
  return {
    title: corta(`📝 Inscrições abertas: ${evento.nome}`, 100),
    body: corta(
      `${cursinho} tem um simulado programado. Toque para se inscrever.`,
      500,
    ),
    url: LINK,
    tag: `evento-${evento.id}`,
  };
}

export function textoDaConfirmacao(
  evento: Pick<EventoSimulado, 'id' | 'nome'>,
  prova: string,
  resultado: ResultadoDaInscricao,
): PushPayload | null {
  if (resultado === 'igual') return null;
  return resultado === 'nova'
    ? {
        title: '✅ Inscrição confirmada',
        body: corta(`${evento.nome} — ${prova}.`, 500),
        url: LINK,
        tag: `inscricao-${evento.id}`,
      }
    : {
        title: '🔁 Prova alterada',
        body: corta(
          `Agora você está inscrito em ${prova} (${evento.nome}).`,
          500,
        ),
        url: LINK,
        tag: `inscricao-${evento.id}`,
      };
}

/**
 * Push do evento (tickets/026, card 04, R5).
 *
 * ⚠️ Nunca derruba quem chamou: push fora do ar (ou desligado — só existe em
 * prod) vira log. A inscrição vale com ou sem notificação.
 */
@Injectable()
export class PushDoEventoService {
  private readonly logger = new Logger(PushDoEventoService.name);

  constructor(
    private readonly push: PushService,
    private readonly alunos: StudentCourseRepository,
  ) {}

  /** Push desligado neste ambiente? (fora de prod, sempre.) */
  habilitado(): boolean {
    try {
      this.push.garantirHabilitado();
      return true;
    } catch {
      return false;
    }
  }

  async avisarAbertura(evento: EventoSimulado): Promise<void> {
    try {
      const alunos = await this.alunos.alunosMatriculadosNo(
        evento.partnerPrepCourseId,
      );
      if (!alunos.length) return;
      await this.push.sendToUsers(alunos, textoDaAbertura(evento));
    } catch (err) {
      this.logger.error(`Aviso de abertura do evento ${evento.id} falhou`, err);
    }
  }

  async confirmar(
    userId: string,
    evento: Pick<EventoSimulado, 'id' | 'nome'>,
    prova: string,
    resultado: ResultadoDaInscricao,
  ): Promise<void> {
    const payload = textoDaConfirmacao(evento, prova, resultado);
    if (!payload) return;
    try {
      await this.push.sendToUsers([userId], payload);
    } catch (err) {
      this.logger.warn(`Confirmação do evento ${evento.id} não saiu: ${err}`);
    }
  }
}
