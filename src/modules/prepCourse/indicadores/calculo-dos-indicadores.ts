import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Metricas } from './metricas';

/**
 * A ÚNICA conta dos indicadores (tickets/033). O cron do snapshot, a leitura
 * ao vivo e o backfill passam todos por aqui — por isso o número da tela de
 * hoje bate com a foto gravada à noite.
 *
 * ⚠️ Calcula pela **data dos eventos** (logs de matrícula e cancelamento,
 * data da chamada), nunca pelo status atual: assim dá para calcular qualquer
 * dia do passado, e o fechamento do período não muda o resultado.
 *
 * Cada card da série acrescenta suas chaves em `calcular`.
 */
@Injectable()
export class CalculoDosIndicadores {
  constructor(
    @InjectEntityManager()
    protected readonly em: EntityManager,
  ) {}

  /**
   * Métricas de cada turma ao fim de `dia` (`YYYY-MM-DD`, São Paulo), para
   * as turmas do período `periodoId`.
   */
  async calcular(
    turmaIds: string[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dia: string,
  ): Promise<Map<string, Metricas>> {
    const porTurma = new Map<string, Metricas>(
      turmaIds.map((id) => [id, {} as Metricas]),
    );
    return porTurma;
  }
}
