import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AnalyticsQueueService } from 'src/modules/prepCourse/class/analytics/queue/analytics-queue.service';
import { StudentCourseRepository } from 'src/modules/prepCourse/studentCourse/student-course.repository';
import { FimDoRecalculoDtoInput } from './fim-do-recalculo.dto';
import { RecalculoAnulacaoJob } from './recalculo-anulacao-job.entity';
import { PushRecalculoAnulacaoRepository } from 'src/modules/push/recalculo-anulacao/push-recalculo-anulacao.repository';

/**
 * O fim de um recálculo por anulação (tickets/042, card 14): os indicadores
 * das turmas afetadas vão para a fila — só as turmas e os meses que mudaram,
 * em vez de esperar o cron semanal.
 *
 * ⚠️ **Idempotente por `jobId`** (linha em `recalculo_anulacao_job`, única):
 * o ms reenvia o aviso, e o reenvio não enfileira de novo.
 */
@Injectable()
export class FimDoRecalculoService {
  private readonly logger = new Logger(FimDoRecalculoService.name);

  constructor(
    @InjectEntityManager() private readonly manager: EntityManager,
    private readonly estudantes: StudentCourseRepository,
    private readonly analytics: AnalyticsQueueService,
    // tickets/042, card 17.
    private readonly pushes: PushRecalculoAnulacaoRepository,
  ) {}

  async receber(
    dto: FimDoRecalculoDtoInput,
  ): Promise<{ duplicado: boolean; enfileirados: number; pushes: number }> {
    const novo = await this.manager.transaction(async (m) => {
      const r = await m
        .createQueryBuilder()
        .insert()
        .into(RecalculoAnulacaoJob)
        .values({
          jobId: dto.jobId,
          provaNome: dto.provaNome,
          afetados: dto.afetados.length,
        })
        .orIgnore()
        .execute();
      // MySQL/MariaDB: `INSERT IGNORE` com a chave já presente afeta 0 linhas.
      const inseriu = (r.raw as { affectedRows?: number })?.affectedRows === 1;
      if (!inseriu) return null;
      /*
        tickets/042, card 17: os pushes "nota atualizada" entram na MESMA
        transação do job — ou os dois, ou nenhum (e o retry do ms refaz).
      */
      return { pushes: await this.pushes.registrar(m, dto) };
    });
    if (!novo) return { duplicado: true, enfileirados: 0, pushes: 0 };

    const enfileirados = await this.enfileirarIndicadores(dto);
    this.logger.log(
      `recálculo ${dto.jobId}: ${dto.afetados.length} afetados, ${enfileirados} indicadores na fila`,
    );
    return { duplicado: false, enfileirados, pushes: novo.pushes };
  }

  /** (turma atual, mês) de cada afetado, sem repetir. */
  private async enfileirarIndicadores(
    dto: FimDoRecalculoDtoInput,
  ): Promise<number> {
    const usuarios = [...new Set(dto.afetados.map((a) => a.usuario))];
    if (!usuarios.length) return 0;
    const turmas = await this.estudantes.findTurmasDosUsuarios(usuarios);
    const turmasDe = new Map<string, Set<string>>();
    for (const t of turmas) {
      turmasDe.set(
        t.userId,
        (turmasDe.get(t.userId) ?? new Set()).add(t.classId),
      );
    }
    const itens = new Map<
      string,
      { classId: string; month: string; type: 'simulado' }
    >();
    for (const a of dto.afetados) {
      for (const classId of turmasDe.get(a.usuario) ?? []) {
        itens.set(`${classId}|${a.mes}`, {
          classId,
          month: a.mes,
          type: 'simulado',
        });
      }
    }
    if (itens.size) await this.analytics.enqueueMany([...itens.values()]);
    return itens.size;
  }
}
