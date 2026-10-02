import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CentralRepository } from './central.repository';

/** Lida some da central depois disto (pedido de 2026-10-02). */
export const LIDA_VISIVEL_MS = 60 * 60 * 1000;
/** Não lida é apagada depois disto: ninguém vai ler aviso de um mês atrás. */
export const DIAS_NAO_LIDA = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

/** Central de notificações do app (série `central-notificacoes`, card 02). */
@Injectable()
export class CentralService {
  private readonly logger = new Logger(CentralService.name);

  constructor(private readonly central: CentralRepository) {}

  async listar(
    userId: string,
    page: number,
    limit: number,
    agora = new Date(),
  ) {
    const lidasDesde = new Date(agora.getTime() - LIDA_VISIVEL_MS);
    const [{ data, totalItems }, naoLidas] = await Promise.all([
      this.central.daPessoa(userId, lidasDesde, page, limit),
      this.central.naoLidas(userId),
    ]);
    return { data, page, limit, totalItems, naoLidas };
  }

  /** ⚠️ De outra pessoa → 404, para não revelar que existe. */
  async marcarLida(userId: string, id: string, agora = new Date()) {
    if (!(await this.central.marcarLida(userId, id, agora)))
      throw new NotFoundException('Notificação não encontrada');
  }

  async marcarTodas(userId: string, agora = new Date()) {
    return { marcadas: await this.central.marcarTodas(userId, agora) };
  }

  /**
   * ⚠️ **Sem lock**, como o `PushCleanupTask`: dois `DELETE` com `WHERE` de
   * data — rodar duas vezes dá no mesmo.
   */
  @Cron('10 4 * * *', {
    name: 'central-cleanup',
    timeZone: 'America/Sao_Paulo',
  })
  async limpar(agora: Date = new Date()) {
    const lidas = await this.central.apagarLidasAntes(
      new Date(agora.getTime() - LIDA_VISIVEL_MS),
    );
    const naoLidas = await this.central.apagarNaoLidasAntes(
      new Date(agora.getTime() - DIAS_NAO_LIDA * DIA_MS),
    );
    this.logger.log(
      `Limpeza da central: ${lidas} lida(s) e ${naoLidas} não lida(s) antiga(s) apagada(s)`,
    );
    return { lidas, naoLidas };
  }
}
