import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { EventoSimulado } from 'src/modules/prepCourse/eventoSimulado/evento-simulado.entity';
import { EventoSimuladoProva } from 'src/modules/prepCourse/eventoSimulado/evento-simulado-prova.entity';

/**
 * Card 41 — o que a prova do cursinho tem nos eventos de simulado (MySQL).
 *
 * ⚠️ Repositório próprio, pelo `EntityManager`, e não o
 * `EventoSimuladoRepository`: importar o `EventoSimuladoModule` aqui fecharia
 * um ciclo com o `SimuladoModule` (via colaborador e estudante).
 */
@Injectable()
export class ProvaNosEventosRepository {
  constructor(@InjectEntityManager() private readonly manager: EntityManager) {}

  /** Nomes dos eventos VIVOS que oferecem a prova. */
  async eventosComProva(provaId: string): Promise<string[]> {
    const linhas = await this.manager
      .getRepository(EventoSimuladoProva)
      .createQueryBuilder('p')
      .innerJoin(EventoSimulado, 'e', 'e.id = p.evento_id')
      .select('e.nome', 'nome')
      .where('p.prova_id = :provaId', { provaId })
      .andWhere('e.deleted_at IS NULL')
      .orderBy('e.nome', 'ASC')
      .getRawMany<{ nome: string }>();
    return linhas.map((l) => l.nome);
  }

  /**
   * O nome da prova é COPIADO em cada evento (`nomeDaProva`, para listar sem ir
   * ao ms). Renomear a prova sem isto deixaria o aluno escolhendo pelo nome
   * antigo.
   */
  async renomearProva(provaId: string, nome: string): Promise<void> {
    await this.manager
      .getRepository(EventoSimuladoProva)
      .update({ provaId }, { nomeDaProva: nome });
  }
}
