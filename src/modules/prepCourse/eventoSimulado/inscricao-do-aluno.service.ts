import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StudentCourseRepository } from '../studentCourse/student-course.repository';
import { EventoSimulado } from './evento-simulado.entity';
import { EventoSimuladoRepository } from './evento-simulado.repository';
import { PushDoEventoService } from './push-do-evento.service';

export type EventoParaOAluno = {
  id: string;
  nome: string;
  descricao: string | null;
  cursinho: string;
  inscricoesAte: Date;
  provas: { provaId: string; nome: string }[];
  /** `null` = ainda não se inscreveu. */
  minhaProvaId: string | null;
};

/** Como a inscrição mudou — o push (card 04) decide por isto. */
export type ResultadoDaInscricao = 'nova' | 'troca' | 'igual';

export const TEXTO_EVENTO_FECHADO =
  'Este evento não está com inscrições abertas.';
export const TEXTO_NAO_MATRICULADO =
  'Só alunos matriculados neste cursinho podem se inscrever.';
export const TEXTO_ESCOLHA_A_PROVA = 'Escolha uma das provas do evento.';

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
  ) {}

  async meus(userId: string): Promise<EventoParaOAluno[]> {
    const cursinhos = await this.alunos.cursinhosEmQueEstaMatriculado(userId);
    const abertos = await this.eventos.findAbertosDosCursinhos(cursinhos);
    const minhas = await this.eventos.inscricoesDoAluno(
      abertos.map((e) => e.id),
      userId,
    );
    const provaPorEvento = new Map(minhas.map((i) => [i.eventoId, i.provaId]));
    return abertos.map((e) => this.paraOAluno(e, provaPorEvento.get(e.id)));
  }

  async inscrever(
    userId: string,
    eventoId: string,
    provaId?: string,
  ): Promise<{ evento: EventoParaOAluno; resultado: ResultadoDaInscricao }> {
    const evento = await this.abertoEMatriculado(userId, eventoId);

    // Uma prova só: não precisa escolher.
    const escolhida =
      provaId ?? (evento.provas.length === 1 ? evento.provas[0].provaId : null);
    if (!escolhida || !evento.provas.some((p) => p.provaId === escolhida)) {
      throw new BadRequestException(TEXTO_ESCOLHA_A_PROVA);
    }

    const resultado = await this.gravar(eventoId, userId, escolhida);
    // Nova e troca avisam; igual não (card 04). Desistir não passa por aqui.
    const nomeDaProva =
      evento.provas.find((p) => p.provaId === escolhida)?.nomeDaProva ?? '';
    await this.push.confirmar(userId, evento, nomeDaProva, resultado);
    return { evento: this.paraOAluno(evento, escolhida), resultado };
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
    provaId: string,
  ): Promise<ResultadoDaInscricao> {
    const atual = await this.eventos.inscricaoDo(eventoId, userId);
    if (!atual) {
      try {
        await this.eventos.inserirInscricao(eventoId, userId, provaId);
        return 'nova';
      } catch (e) {
        if (!ehDuplicado(e)) throw e;
        return this.gravar(eventoId, userId, provaId);
      }
    }
    if (atual.provaId === provaId) return 'igual';
    await this.eventos.trocarProva(atual.id, provaId);
    return 'troca';
  }

  private paraOAluno(
    e: EventoSimulado,
    minhaProvaId?: string,
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
      minhaProvaId: minhaProvaId ?? null,
    };
  }
}
