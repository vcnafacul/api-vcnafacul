import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In, MoreThan } from 'typeorm';
import { FilaDePushRepository } from '../fila/fila-de-push.repository';
import { StatusDoPushDeResultado } from '../resultado-cartao/push-resultado-cartao.entity';
import { PushRecalculoAnulacao } from './push-recalculo-anulacao.entity';

export const JANELA_DO_LIMITE_MS = 24 * 60 * 60 * 1000;
/** Espera do push depois do último recálculo da prova (card 20). */
export const ESPERA_PADRAO_MS = 30 * 60 * 1000;

export interface AfetadoDoPush {
  usuario: string;
  historicoId: string;
  acertosAntes?: number | null;
  totalAntes?: number | null;
  acertosDepois?: number | null;
  totalDepois?: number | null;
}

export interface PedidoDePushDoRecalculo {
  jobId: string;
  provaNome: string;
  simuladoIds: string[];
  numerosAnulados: number[];
  afetados: AfetadoDoPush[];
}

/** A nota voltou ao que era: o push "nota atualizada" seria falso (card 20). */
export function notaNaoMudou(l: {
  acertosAntes: number | null;
  totalAntes: number | null;
  acertosDepois: number | null;
  totalDepois: number | null;
}): boolean {
  return (
    l.acertosAntes != null &&
    l.totalAntes != null &&
    l.acertosAntes === l.acertosDepois &&
    l.totalAntes === l.totalDepois
  );
}

const ouNulo = (n: number | null | undefined) => (n == null ? null : n);

@Injectable()
export class PushRecalculoAnulacaoRepository extends FilaDePushRepository<PushRecalculoAnulacao> {
  constructor(@InjectEntityManager() manager: EntityManager) {
    super(manager, PushRecalculoAnulacao);
  }

  /**
   * Os pushes do fim de um recálculo (tickets/042, cards 17 e 20) — dentro da
   * transação do registro do job (`m`), para job e pushes entrarem juntos.
   *
   * - Um por aluno por job (o primeiro histórico dele no job).
   * - ⚠️ **Espera** (card 20): o push só sai `esperaMs` depois do recálculo.
   *   Se o aluno já tem push PENDENTE desta prova, a linha é ATUALIZADA (novo
   *   job, nota de depois, relógio reiniciado) e mantém a nota de antes da
   *   primeira vez — dois recálculos seguidos viram um push só, o do último.
   * - No máximo 1 enviado por prova por aluno por dia: quem já recebeu (ou está
   *   recebendo) push desta prova nas últimas 24 h fica de fora.
   * - `INSERT IGNORE` no único `(job_id, user_id)`: o retry não duplica.
   *
   * @returns quantos pushes entraram ou foram atualizados na fila.
   */
  async registrar(
    m: EntityManager,
    p: PedidoDePushDoRecalculo,
    agora = new Date(),
    esperaMs = ESPERA_PADRAO_MS,
  ): Promise<number> {
    const recorte = [...p.simuladoIds].sort().join(',').slice(0, 200);
    const porUsuario = new Map<string, AfetadoDoPush>();
    for (const a of p.afetados)
      if (!porUsuario.has(a.usuario)) porUsuario.set(a.usuario, a);
    if (!porUsuario.size) return 0;

    const repo = m.getRepository(PushRecalculoAnulacao);
    const quando = new Date(agora.getTime() + esperaMs);
    const usuarios = [...porUsuario.keys()];
    const quantasAnuladas = Math.max(1, p.numerosAnulados.length);

    // 1. Pendente desta prova → atualiza (não cria outro, não cai no limite).
    const pendentes = await repo.find({
      where: {
        recorte,
        userId: In(usuarios),
        status: StatusDoPushDeResultado.Pendente,
      },
    });
    const atualizados = new Set<string>();
    for (const linha of pendentes) {
      if (atualizados.has(linha.userId)) continue;
      const a = porUsuario.get(linha.userId)!;
      await repo.update(
        { id: linha.id, status: StatusDoPushDeResultado.Pendente },
        {
          jobId: p.jobId,
          historicoId: a.historicoId,
          provaNome: p.provaNome.slice(0, 200),
          quantasAnuladas,
          acertosDepois: ouNulo(a.acertosDepois),
          totalDepois: ouNulo(a.totalDepois),
          proximaTentativaEm: quando,
          updatedAt: agora,
        },
      );
      atualizados.add(linha.userId);
    }

    // 2. Já recebeu (ou está recebendo) nas últimas 24 h → fica de fora.
    const recentes = await repo.find({
      select: { userId: true },
      where: {
        recorte,
        userId: In(usuarios),
        createdAt: MoreThan(new Date(agora.getTime() - JANELA_DO_LIMITE_MS)),
        status: In([
          StatusDoPushDeResultado.Enviando,
          StatusDoPushDeResultado.Enviado,
        ]),
      },
    });
    const jaAvisados = new Set(recentes.map((r) => r.userId));

    // 3. Os demais → linha nova, com a espera.
    const linhas = [...porUsuario.values()]
      .filter((a) => !jaAvisados.has(a.usuario) && !atualizados.has(a.usuario))
      .map((a) => ({
        jobId: p.jobId,
        userId: a.usuario,
        historicoId: a.historicoId,
        recorte,
        provaNome: p.provaNome.slice(0, 200),
        quantasAnuladas,
        acertosAntes: ouNulo(a.acertosAntes),
        totalAntes: ouNulo(a.totalAntes),
        acertosDepois: ouNulo(a.acertosDepois),
        totalDepois: ouNulo(a.totalDepois),
        status: StatusDoPushDeResultado.Pendente,
        proximaTentativaEm: quando,
        createdAt: agora,
        updatedAt: agora,
      }));
    if (!linhas.length) return atualizados.size;
    const r = await m
      .createQueryBuilder()
      .insert()
      .into(PushRecalculoAnulacao)
      .values(linhas)
      .orIgnore()
      .execute();
    return (
      atualizados.size +
      ((r.raw as { affectedRows?: number })?.affectedRows ?? linhas.length)
    );
  }
}
