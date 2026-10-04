import { Injectable, Logger } from '@nestjs/common';
import { EnvService } from 'src/shared/modules/env/env.service';
import { provaCompleta } from './regras-do-evento';
import {
  HttpServiceAxios,
  HttpServiceAxiosFactory,
} from 'src/shared/services/axios/http-service-axios.factory';

export type ProvaDoMs = {
  id: string;
  nome: string;
  cursinhoId: string | null;
  simuladoIds: string[];
  /** Card 38: a mesma regra do "Completa" da tela — ver `provaCompleta`. */
  completa: boolean;
};

/** Lê provas do ms-simulado (dono, nome e simulados) — tickets/026. */
@Injectable()
export class ProvasDoMsService {
  private readonly logger = new Logger(ProvasDoMsService.name);
  private readonly ms: HttpServiceAxios;

  constructor(factory: HttpServiceAxiosFactory, env: EnvService) {
    this.ms = factory.create(env.get('SIMULADO_URL'));
  }

  /**
   * Quem fez cada simulado pelo cartão, desde `desde` (card 05).
   * ⚠️ Sem `try`: sem o ms não há como calcular — quem chama decide.
   */
  async participantesPorCartao(
    simuladoIds: string[],
    desde: Date,
  ): Promise<Record<string, string[]>> {
    return this.ms.post<Record<string, string[]>>(
      'v1/historico/participantes-por-cartao',
      { simuladoIds, desde: desde.toISOString() },
    );
  }

  /** `null` quando a prova não existe (ou o id é inválido). */
  async buscar(id: string): Promise<ProvaDoMs | null> {
    try {
      const p = await this.ms.get<{
        _id: string;
        nome: string;
        cursinhoId?: string | null;
        simulados?: (string | { _id: string })[];
        totalQuestao?: number | null;
        totalQuestaoValidadas?: number;
        questoes?: unknown[];
      } | null>(`v1/prova/${encodeURIComponent(id)}`);
      if (!p) return null;
      return {
        id: String(p._id),
        nome: p.nome,
        cursinhoId: p.cursinhoId ?? null,
        simuladoIds: (p.simulados ?? []).map((s) =>
          typeof s === 'string' ? s : String(s._id),
        ),
        completa: provaCompleta({
          totalQuestao: p.totalQuestao ?? null,
          totalQuestaoValidadas: p.totalQuestaoValidadas ?? 0,
          totalQuestaoCadastradas: p.questoes?.length ?? 0,
        }),
      };
    } catch (err) {
      this.logger.warn(`Prova ${id} não encontrada no ms: ${err}`);
      return null;
    }
  }
}
