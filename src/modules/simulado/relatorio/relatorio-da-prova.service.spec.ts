import { ForbiddenException } from '@nestjs/common';
import { RelatorioService } from './relatorio.service';

/**
 * O relatório da PROVA (tickets/034) — o que difere do relatório do simulado:
 * várias linhas do ms por estudante, e o resumo com os simulados.
 */
const estudante = (userId: string, nome: string) => ({
  userId,
  cod_enrolled: `m-${userId}`,
  user: { firstName: nome, lastName: '', useSocialName: false },
  class: { id: 't-1', name: 'Turma A' },
});

const linha = (usuario: string, simuladoId: string, nota: number) => ({
  usuario,
  simuladoId,
  historicoId: `h-${usuario}-${simuladoId}`,
  status: 'completed',
  aproveitamentoGeral: nota,
});

const montar = (over: any = {}) => {
  const http = {
    buscarLinhasDaProva: jest.fn().mockResolvedValue({
      linhas: over.linhas ?? [],
      totalEstudantesComCartaoNoCursinho: over.totalNoCursinho ?? 0,
      totalDeQuestoes: 90,
      provaNome: 'Prova do cursinho',
      ultimoCartaoEm: null,
      simulados: over.simulados ?? [],
      mesmasQuestoes: over.mesmasQuestoes ?? true,
    }),
    buscarQuestoesDaProva: jest
      .fn()
      .mockResolvedValue({ questoes: [], mesmasQuestoes: false }),
  };
  const studentCourseRepository = {
    findEnrolledForRelatorio: jest
      .fn()
      .mockResolvedValue(over.estudantes ?? []),
    // tickets/036: a turma inclui quem saiu dela; por padrão, os mesmos.
    findUsuariosDaTurmaParaRelatorio: jest
      .fn()
      .mockResolvedValue(
        over.usuariosDaTurma ??
          (over.estudantes ?? []).map((e: { userId: string }) => e.userId),
      ),
    // tickets/036: quem enviou cartão e não está mais matriculado.
    findPorUsuariosParaRelatorio: jest
      .fn()
      .mockResolvedValue(over.exMatriculados ?? []),
  };
  const classRepository = {
    findOneByIdWithPartner: jest
      .fn()
      .mockResolvedValue(
        over.turma ?? { id: 't-1', partnerPrepCourse: { id: 'cur-1' } },
      ),
  };
  const cursinhoResolver = {
    resolveCursinhoIdByUserId: jest.fn().mockResolvedValue('cur-1'),
  };
  return {
    svc: new RelatorioService(
      http as any,
      studentCourseRepository as any,
      classRepository as any,
      cursinhoResolver as any,
    ),
    http,
  };
};

describe('RelatorioService.consultarProva', () => {
  const estudantes = [estudante('u1', 'Ana'), estudante('u2', 'Bia')];

  it('⚠️ estudante com cartão em dois simulados sai em DUAS linhas', async () => {
    const { svc } = montar({
      estudantes,
      linhas: [linha('u1', 's1', 0.5), linha('u1', 's2', 0.9)],
    });

    const r = await svc.consultarProva('colab-1', 'prova-1');

    const doU1 = r.linhas.filter((l) => l.usuario === 'u1');
    expect(doU1.map((l) => l.simuladoId)).toEqual(['s1', 's2']);
    expect(doU1.every((l) => l.nome === 'Ana' && l.enviouCartao)).toBe(true);
  });

  it('quem não enviou nenhum sai em UMA linha, sem simuladoId', async () => {
    const { svc } = montar({
      estudantes,
      linhas: [linha('u1', 's1', 0.5), linha('u1', 's2', 0.9)],
    });

    const r = await svc.consultarProva('colab-1', 'prova-1');

    const doU2 = r.linhas.filter((l) => l.usuario === 'u2');
    expect(doU2).toHaveLength(1);
    expect(doU2[0]).toMatchObject({ enviouCartao: false });
    expect(doU2[0].simuladoId).toBeUndefined();
  });

  it('totalNoRecorte conta ESTUDANTES; a média, APLICAÇÕES com leitura', async () => {
    const { svc } = montar({
      estudantes,
      linhas: [linha('u1', 's1', 0.5), linha('u1', 's2', 0.9)],
    });

    const r = await svc.consultarProva('colab-1', 'prova-1');

    expect(r.linhas).toHaveLength(3);
    expect(r.resumo.totalNoRecorte).toBe(2);
    expect(r.resumo.comLeituraConcluida).toBe(2);
    expect(r.resumo.aproveitamentoGeral).toBeCloseTo(0.7);
  });

  it('o resumo traz o nome da prova como título, os simulados e mesmasQuestoes', async () => {
    const simulados = [
      { simuladoId: 's1', nome: 'Inglês', cartoes: 1, totalDeQuestoes: 90 },
      { simuladoId: 's2', nome: 'Espanhol', cartoes: 1, totalDeQuestoes: 90 },
    ];
    const { svc } = montar({
      estudantes,
      linhas: [linha('u1', 's1', 0.5)],
      simulados,
      mesmasQuestoes: false,
    });

    const r = await svc.consultarProva('colab-1', 'prova-1');

    expect(r.resumo.simuladoNome).toBe('Prova do cursinho');
    expect(r.resumo.simulados).toEqual(simulados);
    expect(r.resumo.mesmasQuestoes).toBe(false);
  });

  it('com turma, manda ao ms a turma ATUAL do MySQL', async () => {
    const { svc, http } = montar({ estudantes });

    await svc.consultarProva('colab-1', 'prova-1', 't-1');

    expect(http.buscarLinhasDaProva).toHaveBeenCalledWith('prova-1', 'cur-1', [
      'u1',
      'u2',
    ]);
  });

  it('turma vazia não pergunta ao ms', async () => {
    const { svc, http } = montar({ estudantes: [] });

    const r = await svc.consultarProva('colab-1', 'prova-1', 't-1');

    expect(http.buscarLinhasDaProva).not.toHaveBeenCalled();
    expect(r.resumo).toMatchObject({
      totalNoRecorte: 0,
      simulados: [],
      mesmasQuestoes: true,
    });
  });

  it('turma de outro cursinho → 403', async () => {
    const { svc } = montar({
      turma: { id: 't-9', partnerPrepCourse: { id: 'outro' } },
    });

    await expect(
      svc.consultarProva('colab-1', 'prova-1', 't-9'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('RelatorioService.consultarQuestoesDaProva', () => {
  it('repassa o agregado do ms, com mesmasQuestoes', async () => {
    const { svc, http } = montar();

    const r = await svc.consultarQuestoesDaProva('colab-1', 'prova-1');

    expect(http.buscarQuestoesDaProva).toHaveBeenCalledWith(
      'prova-1',
      'cur-1',
      undefined,
    );
    expect(r.mesmasQuestoes).toBe(false);
  });

  it('turma vazia não pergunta ao ms', async () => {
    const { svc, http } = montar({ estudantes: [] });

    const r = await svc.consultarQuestoesDaProva('colab-1', 'prova-1', 't-1');

    expect(http.buscarQuestoesDaProva).not.toHaveBeenCalled();
    expect(r).toEqual({ questoes: [], mesmasQuestoes: true });
  });
});
