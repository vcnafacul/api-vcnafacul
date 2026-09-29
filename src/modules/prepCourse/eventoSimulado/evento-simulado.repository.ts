import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager, In, IsNull, LessThanOrEqual, MoreThan } from 'typeorm';
import { EventoSimuladoInscricao } from './evento-simulado-inscricao.entity';
import { EventoSimuladoProva } from './evento-simulado-prova.entity';
import { EventoSimulado } from './evento-simulado.entity';

export type ProvaNova = { provaId: string; nomeDaProva: string };

/**
 * ⚠️ `deletedAt` do `BaseEntity` é coluna comum, não `@DeleteDateColumn`: o
 * TypeORM NÃO filtra sozinho. Toda consulta daqui põe `deletedAt: IsNull()`.
 */
@Injectable()
export class EventoSimuladoRepository extends BaseRepository<EventoSimulado> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(EventoSimulado));
  }

  findDoCursinho(partnerPrepCourseId: string) {
    return this.repository.find({
      where: { partnerPrepCourseId, deletedAt: IsNull() },
      relations: { provas: true },
      order: { inscricoesDe: 'DESC', provas: { ordem: 'ASC' } },
    });
  }

  findUmDoCursinho(id: string, partnerPrepCourseId: string) {
    return this.repository.findOne({
      where: { id, partnerPrepCourseId, deletedAt: IsNull() },
      relations: { provas: true },
      order: { provas: { ordem: 'ASC' } },
    });
  }

  /** `{ provaId → quantos inscritos }` de cada evento pedido. */
  async inscritosPorProva(
    eventoIds: string[],
  ): Promise<Map<string, Map<string, number>>> {
    const out = new Map<string, Map<string, number>>();
    if (!eventoIds.length) return out;
    const linhas = await this._entityManager
      .getRepository(EventoSimuladoInscricao)
      .createQueryBuilder('i')
      .select('i.evento_id', 'eventoId')
      .addSelect('i.prova_id', 'provaId')
      .addSelect('COUNT(*)', 'total')
      .where('i.evento_id IN (:...eventoIds)', { eventoIds })
      .groupBy('i.evento_id')
      .addGroupBy('i.prova_id')
      .getRawMany<{ eventoId: string; provaId: string; total: string }>();
    for (const l of linhas) {
      if (!out.has(l.eventoId)) out.set(l.eventoId, new Map());
      out.get(l.eventoId).set(l.provaId, Number(l.total));
    }
    return out;
  }

  /** Grava o evento e SUBSTITUI as provas, numa transação. */
  async salvarComProvas(
    evento: Partial<EventoSimulado>,
    provas: ProvaNova[],
  ): Promise<string> {
    return this._entityManager.transaction(async (m) => {
      const salvo = await m.save(EventoSimulado, evento);
      await m.delete(EventoSimuladoProva, { eventoId: salvo.id });
      await m.insert(
        EventoSimuladoProva,
        provas.map((p, ordem) => ({ ...p, ordem, eventoId: salvo.id })),
      );
      return salvo.id;
    });
  }

  // ---- aluno (card 03) ----

  /** Eventos DENTRO da janela, dos cursinhos pedidos, com o nome do cursinho. */
  findAbertosDosCursinhos(cursinhoIds: string[], agora = new Date()) {
    if (!cursinhoIds.length) return Promise.resolve([]);
    return this.repository.find({
      where: {
        partnerPrepCourseId: In(cursinhoIds),
        deletedAt: IsNull(),
        inscricoesDe: LessThanOrEqual(agora),
        inscricoesAte: MoreThan(agora),
      },
      relations: { provas: true, partnerPrepCourse: { geo: true } },
      order: { inscricoesAte: 'ASC', provas: { ordem: 'ASC' } },
    });
  }

  /** O evento, se estiver dentro da janela e não excluído. */
  findAberto(id: string, agora = new Date()) {
    return this.repository.findOne({
      where: {
        id,
        deletedAt: IsNull(),
        inscricoesDe: LessThanOrEqual(agora),
        inscricoesAte: MoreThan(agora),
      },
      relations: { provas: true, partnerPrepCourse: { geo: true } },
      order: { provas: { ordem: 'ASC' } },
    });
  }

  private get inscricoes() {
    return this._entityManager.getRepository(EventoSimuladoInscricao);
  }

  inscricoesDoAluno(eventoIds: string[], userId: string) {
    if (!eventoIds.length) return Promise.resolve([]);
    return this.inscricoes.find({ where: { eventoId: In(eventoIds), userId } });
  }

  inscricaoDo(eventoId: string, userId: string) {
    return this.inscricoes.findOne({ where: { eventoId, userId } });
  }

  async inserirInscricao(eventoId: string, userId: string, provaId: string) {
    await this.inscricoes.insert({ eventoId, userId, provaId });
  }

  async trocarProva(inscricaoId: string, provaId: string) {
    await this.inscricoes.update({ id: inscricaoId }, { provaId });
  }

  async apagarInscricao(eventoId: string, userId: string) {
    await this.inscricoes.delete({ eventoId, userId });
  }

  // ---- push de abertura (card 04) ----

  /** Abertos, não excluídos e ainda sem aviso. */
  findParaAvisar(agora = new Date()) {
    return this.repository.find({
      where: {
        deletedAt: IsNull(),
        avisoAberturaEnviadoEm: IsNull(),
        inscricoesDe: LessThanOrEqual(agora),
        inscricoesAte: MoreThan(agora),
      },
      relations: { partnerPrepCourse: { geo: true } },
    });
  }

  /**
   * ⚠️ Reserva atômica: só UM chamador consegue marcar (`affected = 1`) — duas
   * rodadas ou duas instâncias nunca mandam o aviso duas vezes.
   */
  async reservarAviso(id: string, agora = new Date()): Promise<boolean> {
    const r = await this.repository.update(
      { id, avisoAberturaEnviadoEm: IsNull() },
      { avisoAberturaEnviadoEm: agora },
    );
    return r.affected === 1;
  }

  // ---- engajamento (card 05) ----

  inscricoesDoEvento(eventoId: string) {
    return this.inscricoes.find({ where: { eventoId } });
  }

  /** Nome de exibição (social, se o aluno usa) de cada usuário pedido. */
  async nomesDosUsuarios(userIds: string[]): Promise<Map<string, string>> {
    if (!userIds.length) return new Map();
    const linhas = await this._entityManager
      .createQueryBuilder()
      .select('u.id', 'id')
      .addSelect(
        "CONCAT(IF(u.useSocialName = 1 AND u.socialName IS NOT NULL, u.socialName, u.firstName), ' ', u.lastName)",
        'nome',
      )
      .from('users', 'u')
      .where('u.id IN (:...userIds)', { userIds })
      .getRawMany<{ id: string; nome: string }>();
    return new Map(linhas.map((l) => [l.id, l.nome]));
  }

  async excluir(id: string): Promise<void> {
    await this.repository.update({ id }, { deletedAt: new Date() });
  }
}
