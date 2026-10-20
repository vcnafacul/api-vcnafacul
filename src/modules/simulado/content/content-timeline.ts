/**
 * Linha do tempo de uma demanda de conteúdo (tickets/050, D3): junta os
 * quatro cadastros do ms — a demanda, o histórico de arquivos, as propostas
 * de ajuste e o AuditLog — numa lista de eventos ordenada por data.
 *
 * Puro, sem Nest: recebe o que o ms devolveu e devolve eventos com `porId`;
 * quem resolve os nomes é o service, num lote só.
 */

export type TipoDeEvento =
  | 'criada'
  | 'enviada'
  | 'aprovada'
  | 'rejeitada'
  | 'resetada'
  | 'proposta_enviada'
  | 'proposta_aprovada'
  | 'proposta_recusada'
  | 'material_substituido'
  | 'outro';

export interface MaterialDoEvento {
  fileContentId: string;
  tipo: 'documento' | 'video';
  originalName?: string;
  videoId?: string;
}

export interface EventoDaTimeline {
  tipo: TipoDeEvento;
  /** ISO. */
  em: string;
  porId: string;
  /** Preenchido pelo service (nome resolvido, ou o id). */
  por?: string;
  /** Motivo da rejeição, comentário da proposta, mensagem crua do log. */
  detalhe?: string;
  material?: MaterialDoEvento;
  proposalId?: string;
}

export interface FontesDaTimeline {
  content: any;
  historico: any[];
  propostas: any[];
  auditLog: any[];
}

const STATUS_APROVADO = 1;
const STATUS_REJEITADO = 2;

const iso = (d: unknown): string =>
  d instanceof Date ? d.toISOString() : new Date(String(d)).toISOString();

const material = (file: any): MaterialDoEvento | undefined => {
  if (!file || typeof file !== 'object') return undefined;
  return {
    fileContentId: String(file._id ?? file.id),
    tipo: file.tipo === 'video' ? 'video' : 'documento',
    ...(file.originalName ? { originalName: file.originalName } : {}),
    ...(file.videoId ? { videoId: file.videoId } : {}),
  };
};

/**
 * Uma entrada do AuditLog vira um evento. `changes` é JSON: desde o 048/03 é
 * `{ status, message }`; antes era só `{ message: 'Status alterado para N' }`
 * (ou `'reset demand'`). O que não casar vira `'outro'` com a mensagem crua
 * — nunca derruba a timeline.
 */
export function eventoDoAuditLog(entrada: any): EventoDaTimeline {
  const base = { em: iso(entrada.createdAt), porId: String(entrada.user ?? '') };
  let changes: any = {};
  try {
    changes =
      typeof entrada.changes === 'string'
        ? JSON.parse(entrada.changes)
        : (entrada.changes ?? {});
  } catch {
    return { ...base, tipo: 'outro', detalhe: String(entrada.changes ?? '') };
  }
  const message: string | undefined = changes.message;
  if (message === 'reset demand') return { ...base, tipo: 'resetada' };

  let status: number | undefined =
    typeof changes.status === 'number' ? changes.status : undefined;
  if (status === undefined && typeof message === 'string') {
    const m = /^Status alterado para (\d+)$/.exec(message);
    if (m) status = Number(m[1]);
  }
  if (status === STATUS_APROVADO) return { ...base, tipo: 'aprovada' };
  if (status === STATUS_REJEITADO) {
    const generica = /^Status alterado para \d+$/.test(message ?? '');
    return {
      ...base,
      tipo: 'rejeitada',
      ...(message && !generica ? { detalhe: message } : {}),
    };
  }
  return { ...base, tipo: 'outro', detalhe: message ?? JSON.stringify(changes) };
}

export function montarTimeline(f: FontesDaTimeline): EventoDaTimeline[] {
  const eventos: EventoDaTimeline[] = [];
  const c = f.content;

  if (c?.userId && c?.createdAt) {
    eventos.push({ tipo: 'criada', em: iso(c.createdAt), porId: String(c.userId) });
  }

  for (const h of f.historico ?? []) {
    eventos.push({
      tipo: h.source === 'proposal_approved' ? 'material_substituido' : 'enviada',
      em: iso(h.createdAt),
      porId: String(h.uploadedBy ?? ''),
      material: material(h.file),
      ...(h.proposalId ? { proposalId: String(h.proposalId) } : {}),
    });
  }

  for (const p of f.propostas ?? []) {
    const proposalId = String(p._id ?? p.id);
    eventos.push({
      tipo: 'proposta_enviada',
      em: iso(p.createdAt),
      porId: String(p.author ?? ''),
      ...(p.comment ? { detalhe: p.comment } : {}),
      material: material(p.file),
      proposalId,
    });
    if (p.status === STATUS_APROVADO || p.status === STATUS_REJEITADO) {
      // Proposta revisada antes do `reviewedAt` existir: a data é a da criação.
      const aproximada = !p.reviewedAt;
      eventos.push({
        tipo: p.status === STATUS_APROVADO ? 'proposta_aprovada' : 'proposta_recusada',
        em: iso(p.reviewedAt ?? p.createdAt),
        porId: String(p.reviewedBy ?? ''),
        ...(aproximada ? { detalhe: 'data aproximada' } : {}),
        proposalId,
      });
    }
  }

  for (const a of f.auditLog ?? []) {
    if (a.entityType && a.entityType !== 'Content') continue;
    eventos.push(eventoDoAuditLog(a));
  }

  return eventos.sort((x, y) => x.em.localeCompare(y.em));
}
