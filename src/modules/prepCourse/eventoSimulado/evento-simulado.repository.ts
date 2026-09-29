import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager, IsNull } from 'typeorm';
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

  async excluir(id: string): Promise<void> {
    await this.repository.update({ id }, { deletedAt: new Date() });
  }
}
