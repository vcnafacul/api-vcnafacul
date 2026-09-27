import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import { FirebaseService } from 'src/shared/modules/firebase/firebase.service';
import {
  AparelhoDoPublico,
  PushDeviceRepository,
} from './push-device.repository';
import {
  PublicoDoEnvio,
  PushNotification,
  StatusDoEnvio,
} from './push-notification.entity';
import { PushNotificationRepository } from './push-notification.repository';
import {
  ERROS_DE_TOKEN_MORTO,
  PushPayload,
  emLotes,
  validarPayload,
} from './push.regras';

export type ResultadoDoEnvio = { successCount: number; failureCount: number };

export type PublicoResolvido = {
  aparelhos: AparelhoDoPublico[];
  targetUsers: number;
  targetDevices: number;
};

/**
 * Envio de push pelo FCM (série `pwa-push`, BE-05). Reutilizável por qualquer
 * módulo: a tela admin (BE-06), o "enviar teste" (BE-04) e, no futuro, os
 * eventos automáticos.
 *
 * ⚠️ **A mensagem vai só com `data`**, sem o bloco `notification`: quem desenha
 * a notificação é o service worker do client (FE-02). Com `notification`, o
 * SDK do navegador mostraria uma e o SW outra.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly env: EnvService,
    private readonly firebase: FirebaseService,
    private readonly devices: PushDeviceRepository,
    private readonly notifications: PushNotificationRepository,
  ) {}

  garantirHabilitado(): void {
    if (!this.env.get('PUSH_ENABLED') || !this.firebase.isEnabled()) {
      throw new ServiceUnavailableException(
        'Notificações push desativadas neste ambiente',
      );
    }
  }

  async resolverPublico(publico: PublicoDoEnvio): Promise<PublicoResolvido> {
    const aparelhos = await this.devices.ativosDoPublico(publico);
    return {
      aparelhos,
      targetUsers: new Set(aparelhos.map((a) => a.userId)).size,
      targetDevices: aparelhos.length,
    };
  }

  /**
   * Cria o registro do envio (`sending`) e devolve, sem esperar, a função que
   * dispara. A tela admin (BE-06) responde `202` com o registro e dispara em
   * segundo plano; `send` espera tudo.
   */
  async iniciarEnvio(
    payload: PushPayload,
    publico: PublicoDoEnvio,
    sentById?: string,
  ): Promise<{
    envio: PushNotification;
    disparar: () => Promise<PushNotification>;
  }> {
    this.garantirHabilitado();
    validarPayload(payload, this.env.get('FRONT_URL'));

    const { aparelhos, targetUsers, targetDevices } =
      await this.resolverPublico(publico);

    const envio = await this.notifications.salvar(
      Object.assign(new PushNotification(), {
        title: payload.title.trim(),
        body: payload.body.trim(),
        url: payload.url || null,
        audience: publico,
        sentById: sentById ?? null,
        status: StatusDoEnvio.sending,
        targetUsers,
        targetDevices,
        successCount: 0,
        failureCount: 0,
      }),
    );

    const disparar = async () => {
      try {
        const resultado = await this.dispararLotes(aparelhos, {
          ...payload,
          notificationId: envio.id,
          tag: payload.tag ?? envio.id,
        });
        envio.successCount = resultado.successCount;
        envio.failureCount = resultado.failureCount;
        envio.status = StatusDoEnvio.done;
      } catch (error) {
        this.logger.error(`Envio ${envio.id} falhou: ${error?.message}`);
        envio.status = StatusDoEnvio.failed;
      }
      envio.finishedAt = new Date();
      return this.notifications.salvar(envio);
    };

    return { envio, disparar };
  }

  async send(
    payload: PushPayload,
    publico: PublicoDoEnvio,
    sentById?: string,
  ): Promise<PushNotification> {
    const { disparar } = await this.iniciarEnvio(payload, publico, sentById);
    return disparar();
  }

  /** Atalho sem registro no histórico — o "enviar teste para mim" (BE-04). */
  async sendToUsers(
    userIds: string[],
    payload: PushPayload,
  ): Promise<ResultadoDoEnvio> {
    this.garantirHabilitado();
    validarPayload(payload, this.env.get('FRONT_URL'));
    const { aparelhos } = await this.resolverPublico({
      type: 'users',
      userIds,
    });
    return this.dispararLotes(aparelhos, payload);
  }

  private async dispararLotes(
    aparelhos: AparelhoDoPublico[],
    payload: PushPayload & { notificationId?: string },
  ): Promise<ResultadoDoEnvio> {
    // ⚠️ O FCM exige que todo valor de `data` seja string.
    const data: Record<string, string> = {
      title: payload.title.trim(),
      body: payload.body.trim(),
      url: payload.url || '/',
      tag: payload.tag ?? '',
      notificationId: payload.notificationId ?? '',
      icon: this.env.get('PUSH_DEFAULT_ICON_URL') ?? '',
    };

    let successCount = 0;
    let failureCount = 0;
    const mortos: string[] = [];

    for (const lote of emLotes(aparelhos)) {
      const resposta = await this.firebase.messaging().sendEachForMulticast({
        tokens: lote.map((a) => a.token),
        data,
        webpush: {
          // 24h: depois disso o FCM descarta, em vez de entregar aviso velho.
          headers: { Urgency: 'high', TTL: '86400' },
        },
      });
      successCount += resposta.successCount;
      failureCount += resposta.failureCount;
      resposta.responses.forEach((r, i) => {
        if (!r.success && ERROS_DE_TOKEN_MORTO.has(r.error?.code)) {
          mortos.push(lote[i].id);
        }
      });
    }

    if (mortos.length) {
      await this.devices.desativar(mortos);
      this.logger.log(`${mortos.length} aparelho(s) com token morto removidos`);
    }
    return { successCount, failureCount };
  }
}
