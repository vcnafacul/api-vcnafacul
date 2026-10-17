import { Logger } from '@nestjs/common';
import { CentralRepository } from '../central/central.repository';
import { PushPayload } from '../push.regras';
import { PushService } from '../push.service';
import { FilaDePushRepository, LinhaDaFila } from './fila-de-push.repository';

/** Até 20 por rodada, a cada 15 s, um por vez com 250 ms entre eles: ~80/min. */
export const LOTE = 20;
export const PAUSA_MS = 250;
/** Espera antes da 2ª, 3ª tentativa… (em minutos). */
export const ESPERAS_MIN = [1, 5, 30];
export const TENTATIVAS_MAX = 3;
export const DESTRAVAR_APOS_MIN = 10;

/**
 * O envio calmo de uma fila de push (tickets/028, card 03, R4; generalizado no
 * 042, card 17): 100 linhas pendentes saem em ritmo, sem pico no FCM nem na
 * api. Cada subclasse diz o texto e põe o `@Cron`.
 *
 * ⚠️ Rodadas não se sobrepõem (flag `rodando`); e a reserva por linha garante
 * que nem duas instâncias mandam o mesmo push.
 */
export abstract class EnvioCalmoDePush<L extends LinhaDaFila> {
  protected abstract readonly logger: Logger;
  private rodando = false;

  protected constructor(
    protected readonly pendentes: FilaDePushRepository<L>,
    protected readonly push: PushService,
    protected readonly central: CentralRepository,
  ) {}

  protected abstract texto(linha: L): PushPayload;
  /** Como a linha aparece no log. */
  protected abstract rotulo(linha: L): string;

  /** Separado para o teste não esperar de verdade. */
  pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /**
   * O resultado vai para a central do app no estado FINAL da linha — uma vez
   * só, mesmo com as novas tentativas. ⚠️ Falha aqui não trava a fila.
   */
  private async paraCentral(userId: string, texto: PushPayload) {
    try {
      await this.central.gravar([userId], {
        titulo: texto.title,
        corpo: texto.body,
        url: texto.url ?? null,
      });
    } catch (err) {
      this.logger.error(`Central: push de ${userId} não gravou`, err);
    }
  }

  private habilitado(): boolean {
    try {
      this.push.garantirHabilitado();
      return true;
    } catch {
      return false;
    }
  }

  async rodada(agora: Date = new Date()): Promise<number> {
    if (this.rodando) return 0;
    this.rodando = true;
    try {
      await this.pendentes.destravarEnviando(DESTRAVAR_APOS_MIN, agora);
      const lote = await this.pendentes.pendentesVencidos(LOTE, agora);
      if (!lote.length) return 0;

      // Fora de prod o push não existe: tira da fila para ela não crescer.
      if (!this.habilitado()) {
        await this.pendentes.ignorarPendentes(lote.map((l) => l.id));
        for (const linha of lote)
          await this.paraCentral(linha.userId, this.texto(linha));
        return 0;
      }

      let enviados = 0;
      for (const [i, linha] of lote.entries()) {
        if (i > 0) await this.pausa(PAUSA_MS);
        if (!(await this.pendentes.reservar(linha.id, agora))) continue;
        const texto = this.texto(linha);
        try {
          await this.push.sendToUsers([linha.userId], texto);
          await this.pendentes.marcarEnviado(linha.id);
          await this.paraCentral(linha.userId, texto);
          enviados++;
        } catch (err) {
          const tentativas = linha.tentativas + 1;
          if (tentativas >= TENTATIVAS_MAX) {
            await this.pendentes.marcarFalhou(linha.id, tentativas);
            await this.paraCentral(linha.userId, texto);
            this.logger.error(
              `${this.rotulo(linha)}: desisti após ${tentativas} tentativas`,
              err,
            );
          } else {
            const espera = ESPERAS_MIN[tentativas - 1] * 60_000;
            await this.pendentes.reagendar(
              linha.id,
              tentativas,
              new Date(agora.getTime() + espera),
            );
            this.logger.warn(
              `${this.rotulo(linha)}: tentativa ${tentativas} falhou — reagendado`,
            );
          }
        }
      }
      return enviados;
    } finally {
      this.rodando = false;
    }
  }
}
