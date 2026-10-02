import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CentralRepository } from '../central/central.repository';
import { PushPayload } from '../push.regras';
import { PushService } from '../push.service';
import { PushResultadoCartaoRepository } from './push-resultado-cartao.repository';
import { textoDoResultado } from './texto-do-resultado';

/** Até 20 por rodada, a cada 15 s, um por vez com 250 ms entre eles: ~80/min. */
export const LOTE = 20;
export const PAUSA_MS = 250;
/** Espera antes da 2ª, 3ª tentativa… (em minutos). */
export const ESPERAS_MIN = [1, 5, 30];
export const TENTATIVAS_MAX = 3;
const DESTRAVAR_APOS_MIN = 10;

/**
 * Envio calmo do push de resultado do cartão (tickets/028, card 03, R4).
 *
 * 100 cartões processados de uma vez viram 100 linhas pendentes, que saem em
 * ritmo (~1–2 min), sem pico no FCM nem na api. Um aluno = um push.
 *
 * ⚠️ Rodadas não se sobrepõem (flag `rodando`); e a reserva por linha garante
 * que nem duas instâncias mandam o mesmo push.
 */
@Injectable()
export class EnvioDeResultadoTask {
  private readonly logger = new Logger(EnvioDeResultadoTask.name);
  private rodando = false;

  constructor(
    private readonly pendentes: PushResultadoCartaoRepository,
    private readonly push: PushService,
    private readonly central: CentralRepository,
  ) {}

  /**
   * O resultado vai para a central do app no estado FINAL da linha (enviado,
   * desistiu ou push desligado) — uma vez só, mesmo com as novas tentativas.
   * ⚠️ Falha aqui não pode travar a fila do push: só loga.
   */
  private async paraCentral(userId: string, texto: PushPayload) {
    try {
      await this.central.gravar([userId], {
        titulo: texto.title,
        corpo: texto.body,
        url: texto.url ?? null,
      });
    } catch (err) {
      this.logger.error(`Central: resultado de ${userId} não gravou`, err);
    }
  }

  /** Separado para o teste não esperar de verdade. */
  pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

  private habilitado(): boolean {
    try {
      this.push.garantirHabilitado();
      return true;
    } catch {
      return false;
    }
  }

  @Cron('*/15 * * * * *', { name: 'push-resultado-cartao' })
  async rodar(agora: Date = new Date()): Promise<number> {
    if (this.rodando) return 0;
    this.rodando = true;
    try {
      await this.pendentes.destravarEnviando(DESTRAVAR_APOS_MIN, agora);
      const lote = await this.pendentes.pendentesVencidos(LOTE, agora);
      if (!lote.length) return 0;

      // Fora de prod o push não existe: tira da fila para ela não crescer.
      if (!this.habilitado()) {
        await this.pendentes.ignorarPendentes(lote.map((l) => l.id));
        // Sem push, o aluno ainda vê o resultado na central.
        for (const linha of lote)
          await this.paraCentral(linha.userId, textoDoResultado(linha));
        return 0;
      }

      let enviados = 0;
      for (const [i, linha] of lote.entries()) {
        if (i > 0) await this.pausa(PAUSA_MS);
        if (!(await this.pendentes.reservar(linha.id, agora))) continue;
        const texto = textoDoResultado(linha);
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
              `Resultado ${linha.historicoId}: desisti após ${tentativas} tentativas`,
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
              `Resultado ${linha.historicoId}: tentativa ${tentativas} falhou — reagendado`,
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
