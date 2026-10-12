import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EventoSimuladoRepository } from './evento-simulado.repository';
import { GestaoDoEventoService } from './gestao-do-evento.service';
import { ProvasDoMsService } from './provas-do-ms.service';
import { SimuladosDasProvasService } from './simulados-das-provas.service';

/** Os números de uma linha do painel — de um simulado ou da prova inteira. */
export type NumerosDoPainel = {
  inscritos: number;
  /**
   * Quem fez ESTE simulado (ou um desta prova) — inscrito nele ou noutro do
   * evento (card 38). Pode passar de `inscritos`: quem trocou entra aqui, no
   * que fez.
   */
  fizeram: number;
  /** Inscritos AQUI que fizeram outro do evento (card 38; 039: inclui trocar de língua). */
  trocaram: number;
  /** Inscritos aqui que não fizeram nenhum do evento. */
  naoVieram: number;
};

export type EngajamentoDoEvento = {
  /**
   * Uma linha por prova — os números são o TOTAL da prova (o que se imprime do
   * caderno da prova) — com a quebra por simulado (tickets/039, D2). Prova de um
   * simulado: `simulados` tem uma linha, igual à da prova.
   */
  porProva: ({
    provaId: string;
    nome: string;
    simulados: ({ simuladoId: string; nome: string } & NumerosDoPainel)[];
    /**
     * Inscrições de antes da 039 numa prova de vários simulados: não se sabe a
     * língua. Entram no total da prova, não em nenhuma linha.
     */
    semSimulado: number;
  } & NumerosDoPainel)[];
  totalInscritos: number;
  inscritosQueFizeram: number;
  /** inscritos que fizeram ÷ inscritos; `null` sem inscritos. */
  engajamento: number | null;
  /**
   * Cada inscrito: o que escolheu, se fez (qualquer simulado do evento) e QUAL
   * fez. Escolheu um e fez outro = trocou (card 38).
   */
  inscritos: {
    nome: string;
    provaId: string;
    simuladoId: string | null;
    fez: boolean;
    provaQueFez: string | null;
    simuladoQueFez: string | null;
  }[];
  /** Fez pelo cartão sem se inscrever — conta, e aparece à parte. */
  fizeramSemInscricao: { nome: string; provaId: string; simuladoId: string }[];
};

/**
 * Quem fez e o engajamento de um evento (tickets/026, card 05, R6).
 * "Fez" = cartão `completed` num simulado do evento, desde o início da janela
 * (a regra está no ms).
 *
 * ⚠️ tickets/039: "fez" olha TODOS os simulados de cada prova. Antes, só o
 * primeiro ("prova do cursinho = 1 simulado") — no Enem Dia 1, quem fez
 * Espanhol aparecia como "Não veio".
 */
@Injectable()
export class EngajamentoDoEventoService {
  constructor(
    private readonly eventos: EventoSimuladoRepository,
    private readonly gestao: GestaoDoEventoService,
    private readonly ms: ProvasDoMsService,
    private readonly simulados: SimuladosDasProvasService,
  ) {}

  async doEvento(
    userId: string,
    eventoId: string,
  ): Promise<EngajamentoDoEvento> {
    const cursinhoId = await this.gestao.cursinhoDoColaborador(userId);
    const evento = await this.eventos.findUmDoCursinho(eventoId, cursinhoId);
    if (!evento) throw new NotFoundException('Evento não encontrado');

    const simsPorProva = await this.simulados.dasProvas(evento.provas);
    const provas = evento.provas.map((p) => ({
      provaId: p.provaId,
      nome: p.nomeDaProva,
      sims: simsPorProva.get(p.provaId) ?? [],
    }));
    const provaDoSimulado = new Map<string, string>();
    for (const p of provas) {
      for (const s of p.sims) provaDoSimulado.set(s.simuladoId, p.provaId);
    }

    let porSimulado: Record<string, string[]> = {};
    if (provaDoSimulado.size) {
      try {
        porSimulado = await this.ms.participantesPorCartao(
          [...provaDoSimulado.keys()],
          new Date(evento.inscricoesDe),
        );
      } catch {
        throw new ServiceUnavailableException(
          'Não foi possível consultar os cartões agora. Tente de novo em instantes.',
        );
      }
    }

    // usuário → simulado que ele FEZ
    const fezSim = new Map<string, string>();
    for (const [sim, usuarios] of Object.entries(porSimulado)) {
      if (!provaDoSimulado.has(sim)) continue;
      for (const u of usuarios) fezSim.set(u, sim);
    }
    const provaQueFez = (u: string) =>
      fezSim.has(u) ? provaDoSimulado.get(fezSim.get(u)) : undefined;

    const inscricoes = await this.eventos.inscricoesDoEvento(eventoId);
    // O simulado de cada inscrição; a de antes, numa prova de um simulado, é ele.
    const simDaInscricao = (i: {
      provaId: string;
      simuladoId: string | null;
    }) => {
      if (i.simuladoId) return i.simuladoId;
      const sims = provas.find((p) => p.provaId === i.provaId)?.sims ?? [];
      return sims.length === 1 ? sims[0].simuladoId : null;
    };
    const comSim = inscricoes.map((i) => ({ ...i, sim: simDaInscricao(i) }));

    const inscritosIds = new Set(inscricoes.map((i) => i.userId));
    const semInscricao = [...fezSim.keys()].filter((u) => !inscritosIds.has(u));
    const nomes = await this.eventos.nomesDosUsuarios([
      ...inscritosIds,
      ...semInscricao,
    ]);

    /*
      ⚠️ Card 38: "fez" conta na linha do que o aluno FEZ, e não na que ele
      escolheu. O engajamento geral continua valendo para qualquer simulado do
      evento. 039: o mesmo, um nível abaixo — por simulado.
    */
    const linhaDoSimulado = (simuladoId: string) => {
      const aqui = comSim.filter((i) => i.sim === simuladoId);
      return {
        inscritos: aqui.length,
        fizeram: comSim.filter((i) => fezSim.get(i.userId) === simuladoId)
          .length,
        trocaram: aqui.filter(
          (i) => fezSim.has(i.userId) && fezSim.get(i.userId) !== simuladoId,
        ).length,
        naoVieram: aqui.filter((i) => !fezSim.has(i.userId)).length,
      };
    };

    const porProva = provas.map((p) => {
      const simulados = p.sims.map((s) => ({
        simuladoId: s.simuladoId,
        // Um simulado só: o nome é o da prova, como o aluno vê.
        nome: p.sims.length === 1 ? p.nome : s.nome,
        ...linhaDoSimulado(s.simuladoId),
      }));
      // De antes da 039, sem a língua: só no total da prova.
      const semSim = comSim.filter(
        (i) => i.provaId === p.provaId && i.sim === null,
      );
      const soma = (k: keyof NumerosDoPainel) =>
        simulados.reduce((t, s) => t + s[k], 0);
      return {
        provaId: p.provaId,
        nome: p.nome,
        inscritos: comSim.filter((i) => i.provaId === p.provaId).length,
        fizeram: soma('fizeram'),
        trocaram:
          soma('trocaram') +
          semSim.filter(
            (i) => fezSim.has(i.userId) && provaQueFez(i.userId) !== p.provaId,
          ).length,
        naoVieram:
          soma('naoVieram') +
          semSim.filter((i) => !fezSim.has(i.userId)).length,
        simulados,
        semSimulado: semSim.length,
      };
    });
    const inscritosQueFizeram = inscricoes.filter((i) =>
      fezSim.has(i.userId),
    ).length;

    return {
      porProva,
      totalInscritos: inscricoes.length,
      inscritosQueFizeram,
      engajamento: inscricoes.length
        ? inscritosQueFizeram / inscricoes.length
        : null,
      inscritos: comSim
        .map((i) => ({
          nome: nomes.get(i.userId) ?? '',
          provaId: i.provaId,
          simuladoId: i.sim,
          fez: fezSim.has(i.userId),
          provaQueFez: provaQueFez(i.userId) ?? null,
          simuladoQueFez: fezSim.get(i.userId) ?? null,
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      fizeramSemInscricao: semInscricao
        .map((u) => ({
          nome: nomes.get(u) ?? '',
          provaId: provaQueFez(u),
          simuladoId: fezSim.get(u),
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    };
  }
}
