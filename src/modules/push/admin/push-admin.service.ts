import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { PushNotification } from '../push-notification.entity';
import { PushNotificationRepository } from '../push-notification.repository';
import { PushService } from '../push.service';
import {
  EnviarNotificacaoDtoInput,
  PreviewDoPublicoDtoInput,
  paraPublico,
} from './enviar-notificacao.dto';

/** O que a tela admin vê de um envio. */
export function resumoDoEnvio(envio: PushNotification) {
  const autor = envio.sentBy;
  return {
    id: envio.id,
    title: envio.title,
    body: envio.body,
    url: envio.url,
    audience: envio.audience,
    status: envio.status,
    targetUsers: envio.targetUsers,
    targetDevices: envio.targetDevices,
    successCount: envio.successCount,
    failureCount: envio.failureCount,
    createdAt: envio.createdAt,
    finishedAt: envio.finishedAt,
    sentBy: autor
      ? { id: autor.id, name: `${autor.firstName} ${autor.lastName}`.trim() }
      : null,
  };
}

/** Envio pela tela admin (série `pwa-push`, BE-06). */
@Injectable()
export class PushAdminService {
  private readonly logger = new Logger(PushAdminService.name);

  constructor(
    private readonly push: PushService,
    private readonly notifications: PushNotificationRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async preview({ audience }: PreviewDoPublicoDtoInput) {
    this.push.garantirHabilitado();
    const { targetUsers, targetDevices } = await this.push.resolverPublico(
      paraPublico(audience),
    );
    return { targetUsers, targetDevices };
  }

  /**
   * Grava o envio, registra no audit-log e dispara **em segundo plano**: a tela
   * recebe o `202` com o id e acompanha pelo detalhe até `done`.
   */
  async enviar(dto: EnviarNotificacaoDtoInput, userId: string) {
    const { envio, disparar } = await this.push.iniciarEnvio(
      { title: dto.title, body: dto.body, url: dto.url },
      paraPublico(dto.audience),
      userId,
      { recusarPublicoVazio: true },
    );

    await this.auditLog.create({
      entityType: 'push_notification',
      entityId: envio.id,
      changes: {
        acao: 'enviar',
        title: envio.title,
        audience: envio.audience,
        targetUsers: envio.targetUsers,
        targetDevices: envio.targetDevices,
      },
      updatedBy: userId,
    });

    // `disparar` já transforma erro do FCM em `failed`; isto é só a rede de
    // segurança para não virar unhandled rejection.
    void disparar().catch((e) =>
      this.logger.error(`Envio ${envio.id}: ${e?.message}`),
    );

    return {
      id: envio.id,
      targetUsers: envio.targetUsers,
      targetDevices: envio.targetDevices,
      status: envio.status,
    };
  }

  async enviarTeste(userId: string) {
    return this.push.enviarTeste(userId);
  }

  async historico(page: number, limit: number) {
    const r = await this.notifications.historico(page, limit);
    return { ...r, data: r.data.map(resumoDoEnvio) };
  }

  async detalhe(id: string) {
    const envio = await this.notifications.detalhe(id);
    if (!envio) throw new NotFoundException('Envio não encontrado');
    return resumoDoEnvio(envio);
  }
}
