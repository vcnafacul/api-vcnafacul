import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
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
import { CentralRepository } from './central/central.repository';
import { PushNotificationRepository } from './push-notification.repository';
import { RegistrarAparelhoDtoInput } from './dtos/registrar-aparelho.dto';
import { PlataformaDoAparelho, PushDevice } from './push-device.entity';
import {
  ERROS_DE_TOKEN_MORTO,
  PAYLOAD_DE_TESTE,
  hashDoToken,
  PushPayload,
  emLotes,
  validarPayload,
} from './push.regras';

export type ResultadoDoEnvio = {
  successCount: number;
  failureCount: number;
  /** Código do FCM → quantos falharam com ele. */
  failureReasons: Record<string, number>;
};

/** Sem `code` (erro fora do padrão do SDK) ainda conta, com nome próprio. */
export const MOTIVO_DESCONHECIDO = 'desconhecido';

export type PublicoResolvido = {
  aparelhos: AparelhoDoPublico[];
  targetUsers: number;
  targetDevices: number;
};

/** O que a tela admin mostra antes de enviar. */
export type Alcance = {
  /** Com push ativo (aparelho registrado). */
  targetUsers: number;
  targetDevices: number;
  /** Todas as contas do público: quem vê na central do app. */
  pessoas: number;
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
    private readonly central: CentralRepository,
  ) {}

  garantirHabilitado(): void {
    if (!this.env.get('PUSH_ENABLED') || !this.firebase.isEnabled()) {
      throw new ServiceUnavailableException(
        'Notificações push desativadas neste ambiente',
      );
    }
  }

  async alcance(publico: PublicoDoEnvio): Promise<Alcance> {
    const [{ targetUsers, targetDevices }, pessoas] = await Promise.all([
      this.resolverPublico(publico),
      this.central.usuariosDoPublico(publico),
    ]);
    return { targetUsers, targetDevices, pessoas: pessoas.length };
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
    opcoes: { recusarPublicoVazio?: boolean } = {},
  ): Promise<{
    envio: PushNotification;
    disparar: () => Promise<PushNotification>;
    /** Quantas pessoas receberam na central do app. */
    pessoas: number;
  }> {
    this.garantirHabilitado();
    validarPayload(payload, this.env.get('FRONT_URL'));

    const [{ aparelhos, targetUsers, targetDevices }, pessoas] =
      await Promise.all([
        this.resolverPublico(publico),
        this.central.usuariosDoPublico(publico),
      ]);
    // Antes de gravar: um envio para ninguém não entra no histórico.
    // ⚠️ "Ninguém" = ninguém com CONTA (central-notificacoes, card 01): quem
    // não ativou o push ainda vê na central do app.
    if (opcoes.recusarPublicoVazio && pessoas.length === 0) {
      throw new UnprocessableEntityException('Ninguém nesse público tem conta');
    }

    const envio = await this.notifications.criarComCentral(
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
        pessoasCount: pessoas.length,
      }),
      pessoas,
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
        envio.failureReasons = resultado.failureCount
          ? resultado.failureReasons
          : null;
        envio.status = StatusDoEnvio.done;
      } catch (error) {
        this.logger.error(`Envio ${envio.id} falhou: ${error?.message}`);
        envio.status = StatusDoEnvio.failed;
      }
      envio.finishedAt = new Date();
      return this.notifications.salvar(envio);
    };

    return { envio, disparar, pessoas: pessoas.length };
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
    const failureReasons: Record<string, number> = {};
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
        if (r.success) return;
        const motivo = r.error?.code || MOTIVO_DESCONHECIDO;
        failureReasons[motivo] = (failureReasons[motivo] ?? 0) + 1;
        if (ERROS_DE_TOKEN_MORTO.has(r.error?.code)) mortos.push(lote[i].id);
      });
    }

    if (failureCount) {
      this.logger.warn(`Falhas no envio: ${JSON.stringify(failureReasons)}`);
    }
    if (mortos.length) {
      await this.devices.desativar(mortos);
      this.logger.log(`${mortos.length} aparelho(s) com token morto removidos`);
    }
    return { successCount, failureCount, failureReasons };
  }

  // ─── Aparelhos (BE-04) ───────────────────────────────────────────────────

  async registrarAparelho(
    userId: string,
    dto: RegistrarAparelhoDtoInput,
  ): Promise<void> {
    this.garantirHabilitado();
    await this.devices.registrar({
      userId,
      token: dto.token,
      tokenHash: hashDoToken(dto.token),
      platform: dto.platform ?? PlataformaDoAparelho.other,
      standalone: dto.standalone ?? false,
      userAgent: dto.userAgent || null,
    });
  }

  /**
   * ⚠️ **Sem usuário e sem checar a flag.** O logout forçado (sessão expirada)
   * não tem JWT válido, e desligar o push não pode impedir ninguém de parar de
   * receber. Quem tem o token é o próprio aparelho.
   */
  async removerAparelho(token: string): Promise<void> {
    await this.devices.desativarPorHash(hashDoToken(token));
  }

  async aparelhosDoUsuario(userId: string): Promise<PushDevice[]> {
    return this.devices.ativosDoUsuario(userId);
  }

  async desativarAparelhosDoUsuario(userId: string): Promise<void> {
    await this.devices.desativarDoUsuario(userId);
  }

  async enviarTeste(userId: string): Promise<ResultadoDoEnvio> {
    return this.sendToUsers([userId], PAYLOAD_DE_TESTE);
  }
}
