import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EventoSimuladoRepository } from './evento-simulado.repository';
import { GestaoDoEventoService } from './gestao-do-evento.service';
import { ProvasDoMsService } from './provas-do-ms.service';

export type EngajamentoDoEvento = {
  porProva: {
    provaId: string;
    nome: string;
    inscritos: number;
    fizeram: number;
    naoVieram: number;
  }[];
  totalInscritos: number;
  inscritosQueFizeram: number;
  /** inscritos que fizeram ÷ inscritos; `null` sem inscritos. */
  engajamento: number | null;
  /** Cada inscrito: a prova escolhida e se fez (qualquer prova do evento). */
  inscritos: { nome: string; provaId: string; fez: boolean }[];
  /** Fez pelo cartão sem se inscrever — conta, e aparece à parte. */
  fizeramSemInscricao: { nome: string; provaId: string }[];
};

/**
 * Quem fez e o engajamento de um evento (tickets/026, card 05, R6).
 * "Fez" = cartão `completed` num simulado do evento, desde o início da janela
 * (a regra está no ms).
 */
@Injectable()
export class EngajamentoDoEventoService {
  constructor(
    private readonly eventos: EventoSimuladoRepository,
    private readonly gestao: GestaoDoEventoService,
    private readonly ms: ProvasDoMsService,
  ) {}

  async doEvento(
    userId: string,
    eventoId: string,
  ): Promise<EngajamentoDoEvento> {
    const cursinhoId = await this.gestao.cursinhoDoColaborador(userId);
    const evento = await this.eventos.findUmDoCursinho(eventoId, cursinhoId);
    if (!evento) throw new NotFoundException('Evento não encontrado');

    // Prova do cursinho = 1 simulado (CustomProvaFactory).
    const provas = await Promise.all(
      evento.provas.map(async (p) => ({
        provaId: p.provaId,
        nome: p.nomeDaProva,
        simuladoId: (await this.ms.buscar(p.provaId))?.simuladoIds[0] ?? null,
      })),
    );
    const simuladoIds = provas.map((p) => p.simuladoId).filter(Boolean);

    let porSimulado: Record<string, string[]> = {};
    if (simuladoIds.length) {
      try {
        porSimulado = await this.ms.participantesPorCartao(
          simuladoIds,
          new Date(evento.inscricoesDe),
        );
      } catch {
        throw new ServiceUnavailableException(
          'Não foi possível consultar os cartões agora. Tente de novo em instantes.',
        );
      }
    }

    // usuário → prova que ele FEZ
    const fezA = new Map<string, string>();
    for (const p of provas) {
      for (const u of porSimulado[p.simuladoId] ?? []) fezA.set(u, p.provaId);
    }

    const inscricoes = await this.eventos.inscricoesDoEvento(eventoId);
    const inscritosIds = new Set(inscricoes.map((i) => i.userId));
    const semInscricao = [...fezA.keys()].filter((u) => !inscritosIds.has(u));
    const nomes = await this.eventos.nomesDosUsuarios([
      ...inscritosIds,
      ...semInscricao,
    ]);

    const porProva = provas.map((p) => {
      const daProva = inscricoes.filter((i) => i.provaId === p.provaId);
      const fizeram = daProva.filter((i) => fezA.has(i.userId)).length;
      return {
        provaId: p.provaId,
        nome: p.nome,
        inscritos: daProva.length,
        fizeram,
        naoVieram: daProva.length - fizeram,
      };
    });
    const inscritosQueFizeram = inscricoes.filter((i) =>
      fezA.has(i.userId),
    ).length;

    return {
      porProva,
      totalInscritos: inscricoes.length,
      inscritosQueFizeram,
      engajamento: inscricoes.length
        ? inscritosQueFizeram / inscricoes.length
        : null,
      inscritos: inscricoes
        .map((i) => ({
          nome: nomes.get(i.userId) ?? '',
          provaId: i.provaId,
          fez: fezA.has(i.userId),
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      fizeramSemInscricao: semInscricao
        .map((u) => ({ nome: nomes.get(u) ?? '', provaId: fezA.get(u) }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    };
  }
}
