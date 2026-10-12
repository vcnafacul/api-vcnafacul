import { Injectable } from '@nestjs/common';
import {
  EventoSimuladoProva,
  SimuladoDaProvaDoEvento,
} from './evento-simulado-prova.entity';
import { EventoSimuladoRepository } from './evento-simulado.repository';
import { ProvasDoMsService } from './provas-do-ms.service';

/**
 * Os simulados de cada prova de um evento (tickets/039).
 *
 * Ficam copiados na própria prova do evento (`simulados`), gravados ao salvar.
 * Evento salvo antes disso tem a coluna nula: busca no ms e **completa a linha**
 * — uma vez só; uma migration não alcançaria o ms. Se o ms não responder, a
 * prova fica sem simulados nesta leitura e a linha segue nula para a próxima.
 */
@Injectable()
export class SimuladosDasProvasService {
  constructor(
    private readonly eventos: EventoSimuladoRepository,
    private readonly ms: ProvasDoMsService,
  ) {}

  async dasProvas(
    provas: EventoSimuladoProva[],
  ): Promise<Map<string, SimuladoDaProvaDoEvento[]>> {
    const out = new Map<string, SimuladoDaProvaDoEvento[]>();
    await Promise.all(
      provas.map(async (p) => {
        if (p.simulados?.length) {
          out.set(p.provaId, p.simulados);
          return;
        }
        const daProva = (await this.ms.buscar(p.provaId))?.simulados ?? [];
        out.set(p.provaId, daProva);
        if (daProva.length) {
          p.simulados = daProva;
          await this.eventos.completarSimulados(p.id, daProva);
        }
      }),
    );
    return out;
  }
}
