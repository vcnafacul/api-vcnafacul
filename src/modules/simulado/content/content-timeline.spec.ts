import { eventoDoAuditLog, montarTimeline } from './content-timeline';

/** Cinco pessoas: criadora, autora, aprovador, proponente, revisora. */
describe('montarTimeline', () => {
  const t = (min: number) => new Date(Date.UTC(2026, 8, 1, 12, min)).toISOString();

  const fontes = {
    content: { _id: 'c1', userId: 'u-carla', createdAt: t(0) },
    historico: [
      {
        _id: 'h1',
        createdAt: t(10),
        uploadedBy: 'u-ana',
        source: 'initial_upload',
        file: { _id: 'f1', tipo: 'documento', originalName: 'v1.docx' },
      },
      {
        _id: 'h2',
        createdAt: t(50),
        uploadedBy: 'u-dani',
        source: 'proposal_approved',
        proposalId: 'p1',
        file: { _id: 'f2', tipo: 'video', videoId: 'dQw4w9WgXcQ' },
      },
    ],
    propostas: [
      {
        _id: 'p1',
        createdAt: t(40),
        author: 'u-dani',
        comment: 'Troquei por um vídeo',
        status: 1,
        reviewedBy: 'u-eva',
        reviewedAt: t(50),
        file: { _id: 'f2', tipo: 'video', videoId: 'dQw4w9WgXcQ' },
      },
    ],
    auditLog: [
      {
        user: 'u-bruno',
        entityType: 'Content',
        createdAt: t(20),
        changes: JSON.stringify({ status: 1, message: 'Status alterado para 1' }),
      },
    ],
  };

  it('junta os quatro cadastros em ordem de data, com as cinco pessoas', () => {
    const eventos = montarTimeline(fontes);

    expect(eventos.map((e) => `${e.tipo}:${e.porId}`)).toEqual([
      'criada:u-carla',
      'enviada:u-ana',
      'aprovada:u-bruno',
      'proposta_enviada:u-dani',
      'material_substituido:u-dani',
      'proposta_aprovada:u-eva',
    ]);
    expect(eventos[1].material).toEqual({
      fileContentId: 'f1',
      tipo: 'documento',
      originalName: 'v1.docx',
    });
    expect(eventos[3].detalhe).toBe('Troquei por um vídeo');
    expect(eventos[4].proposalId).toBe('p1');
    expect(eventos[5]).not.toHaveProperty('detalhe');
  });

  it('proposta recusada sem reviewedAt (antiga): data da criação e "data aproximada"', () => {
    const eventos = montarTimeline({
      content: {},
      historico: [],
      auditLog: [],
      propostas: [
        { _id: 'p2', createdAt: t(5), author: 'u-dani', status: 2, reviewedBy: 'u-eva' },
      ],
    });
    expect(eventos.map((e) => e.tipo)).toEqual(['proposta_enviada', 'proposta_recusada']);
    expect(eventos[1]).toMatchObject({ em: t(5), porId: 'u-eva', detalhe: 'data aproximada' });
  });

  it('proposta pendente só gera o evento de envio', () => {
    const eventos = montarTimeline({
      content: {},
      historico: [],
      auditLog: [],
      propostas: [{ _id: 'p3', createdAt: t(5), author: 'u-dani', status: 0 }],
    });
    expect(eventos.map((e) => e.tipo)).toEqual(['proposta_enviada']);
  });

  it('ignora log de outra entidade; fontes vazias dão lista vazia', () => {
    expect(
      montarTimeline({
        content: {},
        historico: [],
        propostas: [],
        auditLog: [{ entityType: 'Questao', user: 'x', createdAt: t(1), changes: '{}' }],
      }),
    ).toEqual([]);
  });
});

describe('eventoDoAuditLog — formatos novo e antigo', () => {
  const em = '2026-09-01T12:00:00.000Z';
  const log = (changes: unknown) => ({ user: 'u1', createdAt: em, changes });

  it('novo: { status: 2, message } → rejeitada com o motivo', () => {
    expect(
      eventoDoAuditLog(log(JSON.stringify({ status: 2, message: 'Faltou a bibliografia' }))),
    ).toEqual({ tipo: 'rejeitada', em, porId: 'u1', detalhe: 'Faltou a bibliografia' });
  });

  it('antigo: "Status alterado para 1" → aprovada; "para 2" → rejeitada sem detalhe', () => {
    expect(eventoDoAuditLog(log('{"message":"Status alterado para 1"}')).tipo).toBe('aprovada');
    const r = eventoDoAuditLog(log('{"message":"Status alterado para 2"}'));
    expect(r.tipo).toBe('rejeitada');
    expect(r).not.toHaveProperty('detalhe');
  });

  it('"reset demand" → resetada', () => {
    expect(eventoDoAuditLog(log('{"message":"reset demand"}')).tipo).toBe('resetada');
  });

  it('mensagem desconhecida ou JSON quebrado → outro, com o texto cru', () => {
    expect(eventoDoAuditLog(log('{"message":"qualquer coisa"}'))).toMatchObject({
      tipo: 'outro',
      detalhe: 'qualquer coisa',
    });
    expect(eventoDoAuditLog(log('não é json'))).toMatchObject({
      tipo: 'outro',
      detalhe: 'não é json',
    });
  });
});
