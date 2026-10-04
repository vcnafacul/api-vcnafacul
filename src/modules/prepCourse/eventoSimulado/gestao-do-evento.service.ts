import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CollaboratorRepository } from '../collaborator/collaborator.repository';
import { SalvarEventoDtoInput } from './dtos/salvar-evento.dto';
import { EventoSimulado } from './evento-simulado.entity';
import { EventoSimuladoRepository } from './evento-simulado.repository';
import { ProvasDoMsService } from './provas-do-ms.service';
import { PushDoEventoService } from './push-do-evento.service';
import { StatusDoEvento, statusDoEvento } from './regras-do-evento';

export type EventoDoCursinho = {
  id: string;
  nome: string;
  descricao: string | null;
  inscricoesDe: Date;
  inscricoesAte: Date;
  status: StatusDoEvento;
  provas: { provaId: string; nome: string; inscritos: number }[];
  totalInscritos: number;
};

export const TEXTO_JANELA_INVERTIDA =
  'O fim das inscrições tem de ser depois do início.';
export const TEXTO_PROVA_DE_OUTRO =
  'Só dá para usar provas do seu cursinho no evento.';
export const TEXTO_PROVA_COM_INSCRITOS = 'Há alunos inscritos nesta prova.';
export const TEXTO_PROVA_INCOMPLETA = 'Só dá para usar provas completas.';

/**
 * O cursinho gerencia os eventos (tickets/026, card 02).
 * ⚠️ O cursinho sai SEMPRE do colaborador logado; evento de outro → 404.
 */
@Injectable()
export class GestaoDoEventoService {
  constructor(
    private readonly eventos: EventoSimuladoRepository,
    private readonly colaboradores: CollaboratorRepository,
    private readonly provasDoMs: ProvasDoMsService,
    private readonly pushDoEvento: PushDoEventoService,
  ) {}

  async cursinhoDoColaborador(userId: string): Promise<string> {
    const c = await this.colaboradores.findOneByUserId(userId);
    if (!c?.partnerPrepCourse || c.actived === false) {
      throw new ForbiddenException(
        'Só colaboradores ativos de um cursinho gerenciam eventos.',
      );
    }
    return c.partnerPrepCourse.id;
  }

  async listar(userId: string): Promise<EventoDoCursinho[]> {
    const cursinhoId = await this.cursinhoDoColaborador(userId);
    const eventos = await this.eventos.findDoCursinho(cursinhoId);
    const inscritos = await this.eventos.inscritosPorProva(
      eventos.map((e) => e.id),
    );
    return eventos.map((e) => this.paraTela(e, inscritos.get(e.id)));
  }

  async criar(userId: string, dto: SalvarEventoDtoInput) {
    const cursinhoId = await this.cursinhoDoColaborador(userId);
    const provas = await this.validar(cursinhoId, dto, []);
    const id = await this.eventos.salvarComProvas(
      {
        partnerPrepCourseId: cursinhoId,
        nome: dto.nome.trim(),
        descricao: dto.descricao?.trim() || null,
        inscricoesDe: new Date(dto.inscricoesDe),
        inscricoesAte: new Date(dto.inscricoesAte),
      },
      provas,
    );
    return this.umDoCursinho(id, cursinhoId);
  }

  async editar(userId: string, id: string, dto: SalvarEventoDtoInput) {
    const cursinhoId = await this.cursinhoDoColaborador(userId);
    const atual = await this.eventos.findUmDoCursinho(id, cursinhoId);
    if (!atual) throw new NotFoundException('Evento não encontrado');
    const provas = await this.validar(
      cursinhoId,
      dto,
      atual.provas.map((p) => p.provaId),
    );

    // Tirar do evento uma prova com inscritos deixaria inscrição órfã (R: 409).
    const inscritos = (await this.eventos.inscritosPorProva([id])).get(id);
    const ficam = new Set(dto.provaIds);
    const saiComInscrito = atual.provas.find(
      (p) => !ficam.has(p.provaId) && (inscritos?.get(p.provaId) ?? 0) > 0,
    );
    if (saiComInscrito) {
      throw new ConflictException(
        `${TEXTO_PROVA_COM_INSCRITOS} (${saiComInscrito.nomeDaProva})`,
      );
    }

    // ⚠️ `avisoAberturaEnviadoEm` NÃO é mexido: editar a janela não reenvia o
    // push de abertura (R5).
    await this.eventos.salvarComProvas(
      {
        id,
        partnerPrepCourseId: cursinhoId,
        nome: dto.nome.trim(),
        descricao: dto.descricao?.trim() || null,
        inscricoesDe: new Date(dto.inscricoesDe),
        inscricoesAte: new Date(dto.inscricoesAte),
      },
      provas,
    );
    return this.umDoCursinho(id, cursinhoId);
  }

  async excluir(userId: string, id: string): Promise<void> {
    const cursinhoId = await this.cursinhoDoColaborador(userId);
    const atual = await this.eventos.findUmDoCursinho(id, cursinhoId);
    if (!atual) throw new NotFoundException('Evento não encontrado');

    // Lidas ANTES: depois da exclusão o evento some das consultas.
    const inscricoes = await this.eventos.inscricoesDoEvento(id);
    await this.eventos.excluir(id);

    /*
      ⚠️ Card 38: os inscritos são avisados — antes o card simplesmente sumia
      do painel deles, e vários apareciam no cursinho no dia. Evento já
      ENCERRADO não avisa: o simulado aconteceu, excluir ali é arrumação, e
      "foi cancelado" seria falso.
    */
    if (inscricoes.length && statusDoEvento(atual) !== 'encerrado') {
      await this.pushDoEvento.avisarCancelamento(
        atual,
        inscricoes.map((i) => i.userId),
      );
    }
  }

  /**
   * Janela e provas — tudo ANTES de gravar.
   *
   * @param jaNoEvento provas que o evento já tinha. ⚠️ Card 38: elas não
   * precisam estar completas — uma prova que deixou de estar (questão
   * reprovada depois) não pode impedir de editar o nome ou a janela, e tirá-la
   * com inscritos já é 409.
   */
  private async validar(
    cursinhoId: string,
    dto: SalvarEventoDtoInput,
    jaNoEvento: string[],
  ) {
    if (new Date(dto.inscricoesDe) >= new Date(dto.inscricoesAte)) {
      throw new BadRequestException(TEXTO_JANELA_INVERTIDA);
    }
    const provas = await Promise.all(
      dto.provaIds.map((id) => this.provasDoMs.buscar(id)),
    );
    if (provas.some((p) => !p || p.cursinhoId !== cursinhoId)) {
      throw new BadRequestException(TEXTO_PROVA_DE_OUTRO);
    }
    // Card 38: "Só aparecem provas completas" era regra só da tela.
    const antigas = new Set(jaNoEvento);
    if (provas.some((p) => !p.completa && !antigas.has(p.id))) {
      throw new BadRequestException(TEXTO_PROVA_INCOMPLETA);
    }
    return provas.map((p) => ({ provaId: p.id, nomeDaProva: p.nome }));
  }

  private async umDoCursinho(id: string, cursinhoId: string) {
    const e = await this.eventos.findUmDoCursinho(id, cursinhoId);
    const inscritos = await this.eventos.inscritosPorProva([id]);
    return this.paraTela(e, inscritos.get(id));
  }

  private paraTela(
    e: EventoSimulado,
    inscritos?: Map<string, number>,
  ): EventoDoCursinho {
    const provas = (e.provas ?? []).map((p) => ({
      provaId: p.provaId,
      nome: p.nomeDaProva,
      inscritos: inscritos?.get(p.provaId) ?? 0,
    }));
    return {
      id: e.id,
      nome: e.nome,
      descricao: e.descricao,
      inscricoesDe: e.inscricoesDe,
      inscricoesAte: e.inscricoesAte,
      status: statusDoEvento(e),
      provas,
      totalInscritos: provas.reduce((s, p) => s + p.inscritos, 0),
    };
  }
}
