import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In, MoreThan } from 'typeorm';
import { FilaDePushRepository } from '../fila/fila-de-push.repository';
import { StatusDoPushDeResultado } from '../resultado-cartao/push-resultado-cartao.entity';
import { PushRecalculoAnulacao } from './push-recalculo-anulacao.entity';

export const JANELA_DO_LIMITE_MS = 24 * 60 * 60 * 1000;

export interface PedidoDePushDoRecalculo {
  jobId: string;
  provaNome: string;
  simuladoIds: string[];
  numerosAnulados: number[];
  afetados: { usuario: string; historicoId: string }[];
}

@Injectable()
export class PushRecalculoAnulacaoRepository extends FilaDePushRepository<PushRecalculoAnulacao> {
  constructor(@InjectEntityManager() manager: EntityManager) {
    super(manager, PushRecalculoAnulacao);
  }

  /**
   * Os pushes do fim de um recálculo (tickets/042, card 17) — dentro da
   * transação do registro do job (`m`), para job e pushes entrarem juntos.
   *
   * - Um por aluno por job (o primeiro histórico dele no job).
   * - ⚠️ No máximo 1 por prova por aluno por dia: quem já tem push desta prova
   *   nas últimas 24 h (pendente, enviando ou enviado) fica de fora — um
   *   segundo recálculo no mesmo dia (desanulou e recalculou) não manda outro.
   * - `INSERT IGNORE` no único `(job_id, user_id)`: o retry não duplica.
   *
   * @returns quantos pushes entraram na fila.
   */
  async registrar(
    m: EntityManager,
    p: PedidoDePushDoRecalculo,
    agora = new Date(),
  ): Promise<number> {
    const recorte = [...p.simuladoIds].sort().join(',').slice(0, 200);
    const porUsuario = new Map<string, string>();
    for (const a of p.afetados)
      if (!porUsuario.has(a.usuario)) porUsuario.set(a.usuario, a.historicoId);
    if (!porUsuario.size) return 0;

    const repo = m.getRepository(PushRecalculoAnulacao);
    const recentes = await repo.find({
      select: { userId: true },
      where: {
        recorte,
        userId: In([...porUsuario.keys()]),
        createdAt: MoreThan(new Date(agora.getTime() - JANELA_DO_LIMITE_MS)),
        status: In([
          StatusDoPushDeResultado.Pendente,
          StatusDoPushDeResultado.Enviando,
          StatusDoPushDeResultado.Enviado,
        ]),
      },
    });
    const jaAvisados = new Set(recentes.map((r) => r.userId));
    const linhas = [...porUsuario]
      .filter(([u]) => !jaAvisados.has(u))
      .map(([userId, historicoId]) => ({
        jobId: p.jobId,
        userId,
        historicoId,
        recorte,
        provaNome: p.provaNome.slice(0, 200),
        quantasAnuladas: Math.max(1, p.numerosAnulados.length),
        status: StatusDoPushDeResultado.Pendente,
        proximaTentativaEm: agora,
        createdAt: agora,
        updatedAt: agora,
      }));
    if (!linhas.length) return 0;
    const r = await m
      .createQueryBuilder()
      .insert()
      .into(PushRecalculoAnulacao)
      .values(linhas)
      .orIgnore()
      .execute();
    return (r.raw as { affectedRows?: number })?.affectedRows ?? linhas.length;
  }
}
