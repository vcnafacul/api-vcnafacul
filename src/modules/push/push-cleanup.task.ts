import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PushDeviceRepository } from './push-device.repository';

/** Sem abrir o app por este tempo, o aparelho é desativado. */
export const DIAS_SEM_USO = 60;
/** Desativado há este tempo, o registro é apagado de vez. */
export const DIAS_DESATIVADO = 30;

const DIA_MS = 24 * 60 * 60 * 1000;

export function limitesDaLimpeza(agora: Date) {
  return {
    semUsoDesde: new Date(agora.getTime() - DIAS_SEM_USO * DIA_MS),
    desativadoAntes: new Date(agora.getTime() - DIAS_DESATIVADO * DIA_MS),
  };
}

/**
 * Limpeza diária dos aparelhos (série `pwa-push`, BE-07).
 *
 * Token morre sem avisar (app desinstalado, dados do navegador limpos, celular
 * trocado). O envio (BE-05) só desativa o que o FCM recusa; aparelho que nunca
 * mais recebe envio ficaria na base para sempre. E guardar menos é o que a
 * LGPD pede.
 *
 * ⚠️ Quem usa não expira: o client renova o `last_seen_at` a cada login ou
 * abertura do app (FE-03, `POST /push/devices`).
 *
 * ⚠️ **Sem lock.** Nenhum cron do projeto tem, e aqui não precisa: são dois
 * comandos com `WHERE` de data — rodar duas vezes dá no mesmo.
 */
@Injectable()
export class PushCleanupTask {
  private readonly logger = new Logger(PushCleanupTask.name);

  constructor(private readonly devices: PushDeviceRepository) {}

  @Cron('0 4 * * *', { name: 'push-cleanup', timeZone: 'America/Sao_Paulo' })
  async limpar(agora: Date = new Date()) {
    const { semUsoDesde, desativadoAntes } = limitesDaLimpeza(agora);
    // A ordem não importa: o que é desativado agora ganha `deleted_at = agora`
    // e só cai no corte dos 30 dias daqui a 30 dias.
    const apagados = await this.devices.apagarDesativadosAntes(desativadoAntes);
    const desativados = await this.devices.desativarSemUsoDesde(
      semUsoDesde,
      agora,
    );
    this.logger.log(
      `Limpeza de push: ${desativados} aparelho(s) sem uso desativado(s), ${apagados} apagado(s)`,
    );
    return { desativados, apagados };
  }
}
