import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StudentCourseRepository } from '../studentCourse/student-course.repository';
import { EventoSimuladoInscricao } from './evento-simulado-inscricao.entity';
import { SimuladoDaProvaDoEvento } from './evento-simulado-prova.entity';
import { EventoSimulado } from './evento-simulado.entity';
import { EventoSimuladoRepository } from './evento-simulado.repository';
import { PushDoEventoService } from './push-do-evento.service';
import { SimuladosDasProvasService } from './simulados-das-provas.service';

/**
 * O que o aluno escolhe (tickets/039): um SIMULADO de uma prova do evento.
 * Prova de um simulado = uma opção, com o nome da prova; Enem Dia 1 = duas,
 * com o nome de cada simulado ("… Inglês", "… Espanhol"). Prova cujos simulados
 * não se conseguiu ler vira uma opção sem simulado (`simuladoId` nulo).
 */
export type OpcaoDoEvento = {
  provaId: string;
  simuladoId: string | null;
  nome: string;
};

export type EventoParaOAluno = {
  id: string;
  nome: string;
  descricao: string | null;
  cursinho: string;
  inscricoesAte: Date;
  provas: { provaId: string; nome: string }[];
  /** tickets/039: uma por simulado — é daqui que o aluno escolhe. */
  opcoes: OpcaoDoEvento[];
  /** `null` = ainda não se inscreveu. */
  minhaProvaId: string | null;
  /** O simulado escolhido; na inscrição de antes, o único da prova. */
  meuSimuladoId: string | null;
};

/** Como a inscrição mudou — o push (card 04) decide por isto. */
export type ResultadoDaInscricao = 'nova' | 'troca' | 'igual';

export const TEXTO_EVENTO_FECHADO =
  'Este evento não está com inscrições abertas.';
export const TEXTO_NAO_MATRICULADO =
  'Só alunos matriculados neste cursinho podem se inscrever.';
export const TEXTO_ESCOLHA_A_PROVA = 'Escolha uma das opções do evento.';

const ehDuplicado = (e: unknown) =>
  (e as { code?: string })?.code === 'ER_DUP_ENTRY';

/**
 * O aluno e os eventos (tickets/026, card 03). Fora da janela o evento "não
 * existe" para o aluno (404); sem matrícula naquele cursinho, 403.
 */
@Injectable()
export class InscricaoDoAlunoService {
  constructor(
    private readonly eventos: EventoSimuladoRepository,
    private readonly alunos: StudentCourseRepository,
    private readonly push: PushDoEventoService,
    private readonly simulados: SimuladosDasProvasService,
  ) {}

  async meus(userId: string): Promise<EventoParaOAluno[]> {
    const cursinhos = await this.alunos.cursinhosEmQueEstaMatriculado(userId);
    const abertos = await this.eventos.findAbertosDosCursinhos(cursinhos);
    const minhas = await this.eventos.inscricoesDoAluno(
      abertos.map((e) => e.id),
      userId,
    );
    const minhaPorEvento = new Map(minhas.map((i) => [i.eventoId, i]));
    return Promise.all(
      abertos.map(async (e) =>
        this.paraOAluno(e, await this.opcoesDo(e), minhaPorEvento.get(e.id)),
      ),
    );
  }

  async inscrever(
    userId: string,
    eventoId: string,
    provaId?: string,
    simuladoId?: string,
  ): Promise<{ evento: EventoParaOAluno; resultado: ResultadoDaInscricao }> {
    const evento = await this.abertoEMatriculado(userId, eventoId);
    const opcoes = await this.opcoesDo(evento);
    const escolhida = this.escolher(opcoes, provaId, simuladoId);

    const resultado = await this.gravar(eventoId, userId, escolhida, opcoes);
    // Nova e troca avisam; igual não (card 04). Desistir não passa por aqui.
    await this.push.confirmar(userId, evento, escolhida.nome, resultado);
    return {
      evento: this.paraOAluno(evento, opcoes, {
        provaId: escolhida.provaId,
        simuladoId: escolhida.simuladoId,
      }),
      resultado,
    };
  }

  /**
   * A opção pedida. Com o simulado, vale ele (e a prova, se vier, tem de ser a
   * dele). Sem o simulado, só quando não há o que escolher — a prova tem uma
   * opção, ou o evento tem uma só: é o client de antes da 039, que manda só a
   * prova. Fora isso, 400.
   */
  private escolher(
    opcoes: OpcaoDoEvento[],
    provaId?: string,
    simuladoId?: string,
  ): OpcaoDoEvento {
    let candidatas = opcoes;
    if (provaId) candidatas = candidatas.filter((o) => o.provaId === provaId);
    if (simuladoId) {
      candidatas = candidatas.filter((o) => o.simuladoId === simuladoId);
    }
    if (candidatas.length !== 1) {
      throw new BadRequestException(TEXTO_ESCOLHA_A_PROVA);
    }
    return candidatas[0];
  }

  /** As opções do evento, na ordem das provas. */
  private async opcoesDo(e: EventoSimulado): Promise<OpcaoDoEvento[]> {
    const provas = e.provas ?? [];
    const porProva = await this.simulados.dasProvas(provas);
    return provas.flatMap((p) => {
      const sims: SimuladoDaProvaDoEvento[] = porProva.get(p.provaId) ?? [];
      if (!sims.length) {
        return [{ provaId: p.provaId, simuladoId: null, nome: p.nomeDaProva }];
      }
      return sims.map((s) => ({
        provaId: p.provaId,
        simuladoId: s.simuladoId,
        // Um simulado só: o nome é o da prova, como sempre foi para o aluno.
        nome: sims.length === 1 ? p.nomeDaProva : s.nome,
      }));
    });
  }

  /**
   * O simulado de uma inscrição. A de antes da 039 não tem: numa prova de um
   * simulado só, vale o único; com vários, não dá para saber (nulo).
   */
  private simuladoDa(
    i: Pick<EventoSimuladoInscricao, 'provaId' | 'simuladoId'>,
    opcoes: OpcaoDoEvento[],
  ): string | null {
    if (i.simuladoId) return i.simuladoId;
    const daProva = opcoes.filter((o) => o.provaId === i.provaId);
    return daProva.length === 1 ? daProva[0].simuladoId : null;
  }

  async desistir(userId: string, eventoId: string): Promise<void> {
    await this.abertoEMatriculado(userId, eventoId);
    await this.eventos.apagarInscricao(eventoId, userId);
  }

  private async abertoEMatriculado(userId: string, eventoId: string) {
    const evento = await this.eventos.findAberto(eventoId);
    if (!evento) throw new NotFoundException(TEXTO_EVENTO_FECHADO);
    const matriculado = await this.alunos.ehAlunoMatriculadoNo(
      userId,
      evento.partnerPrepCourseId,
    );
    if (!matriculado) throw new ForbiddenException(TEXTO_NAO_MATRICULADO);
    return evento;
  }

  /**
   * Upsert pela unicidade (evento, aluno). ⚠️ Duas requisições juntas: a
   * segunda bate no UNIQUE e cai na troca — nunca duas inscrições.
   */
  private async gravar(
    eventoId: string,
    userId: string,
    escolhida: OpcaoDoEvento,
    opcoes: OpcaoDoEvento[],
  ): Promise<ResultadoDaInscricao> {
    const { provaId, simuladoId } = escolhida;
    const atual = await this.eventos.inscricaoDo(eventoId, userId);
    if (!atual) {
      try {
        await this.eventos.inserirInscricao(
          eventoId,
          userId,
          provaId,
          simuladoId,
        );
        return 'nova';
      } catch (e) {
        if (!ehDuplicado(e)) throw e;
        return this.gravar(eventoId, userId, escolhida, opcoes);
      }
    }
    // tickets/039 (D3): trocar só de simulado (Inglês → Espanhol) é troca.
    if (
      atual.provaId === provaId &&
      this.simuladoDa(atual, opcoes) === simuladoId
    ) {
      // A de antes, sem simulado, ganha o simulado agora — sem virar troca.
      if (!atual.simuladoId && simuladoId) {
        await this.eventos.trocarProva(atual.id, provaId, simuladoId);
      }
      return 'igual';
    }
    await this.eventos.trocarProva(atual.id, provaId, simuladoId);
    return 'troca';
  }

  private paraOAluno(
    e: EventoSimulado,
    opcoes: OpcaoDoEvento[],
    minha?: Pick<EventoSimuladoInscricao, 'provaId' | 'simuladoId'>,
  ): EventoParaOAluno {
    return {
      id: e.id,
      nome: e.nome,
      descricao: e.descricao,
      cursinho: e.partnerPrepCourse?.geo?.name ?? '',
      inscricoesAte: e.inscricoesAte,
      provas: (e.provas ?? []).map((p) => ({
        provaId: p.provaId,
        nome: p.nomeDaProva,
      })),
      opcoes,
      minhaProvaId: minha?.provaId ?? null,
      meuSimuladoId: minha ? this.simuladoDa(minha, opcoes) : null,
    };
  }
}
