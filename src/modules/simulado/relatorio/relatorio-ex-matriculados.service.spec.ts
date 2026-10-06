import { RelatorioService } from './relatorio.service';

/**
 * tickets/036 — o cartão enviado vale para sempre.
 *
 * A regra de só listar matriculados vale para ENVIAR o cartão. Depois de
 * enviado, quem cancelou ou teve a matrícula encerrada continua no relatório:
 * ele é registro histórico, e voltar a ele daqui a um ano tem de mostrar quem
 * fez e como foi.
 */
const estudante = (userId: string, over: any = {}) => ({
  userId,
  cod_enrolled: `m-${userId}`,
  applicationStatus: 'Matriculado',
  updatedAt: new Date('2026-01-01'),
  user: { firstName: userId.toUpperCase(), lastName: '', useSocialName: false },
  class: { id: 't-1', name: 'Turma A' },
  ...over,
});

const linhaDoMs = (usuario: string) => ({
  usuario,
  simuladoId: 's1',
  historicoId: `h-${usuario}`,
  status: 'completed',
  aproveitamentoGeral: 0.5,
});

const montar = (over: any = {}) => {
  const http = {
    buscarLinhas: jest.fn().mockResolvedValue({
      linhas: over.linhas ?? [],
      totalEstudantesComCartaoNoCursinho: (over.linhas ?? []).length,
      totalDeQuestoes: 90,
      simuladoNome: 'Simulado',
      ultimoCartaoEm: null,
    }),
    buscarQuestoes: jest.fn().mockResolvedValue({ questoes: [] }),
    buscarSimulados: jest.fn().mockResolvedValue({ simulados: [] }),
  };
  const studentCourseRepository = {
    findEnrolledForRelatorio: jest
      .fn()
      .mockResolvedValue(over.matriculados ?? []),
    findUsuariosDaTurmaParaRelatorio: jest
      .fn()
      .mockResolvedValue(over.usuariosDaTurma ?? []),
    findPorUsuariosParaRelatorio: jest
      .fn()
      .mockResolvedValue(over.exMatriculados ?? []),
  };
  const classRepository = {
    findOneByIdWithPartner: jest
      .fn()
      .mockResolvedValue({ id: 't-1', partnerPrepCourse: { id: 'cur-1' } }),
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
    studentCourseRepository,
  };
};

describe('relatório — quem não está mais matriculado (036)', () => {
  it('⚠️ cancelado com cartão CONTINUA no relatório, com a situação da matrícula', async () => {
    const { svc } = montar({
      matriculados: [estudante('ana')],
      linhas: [linhaDoMs('ana'), linhaDoMs('bia')],
      exMatriculados: [
        estudante('bia', { applicationStatus: 'Matrícula Cancelada' }),
      ],
    });

    const r = await svc.consultar('colab', 's1');

    const bia = r.linhas.find((l) => l.usuario === 'bia');
    expect(bia).toMatchObject({
      enviouCartao: true,
      historicoId: 'h-bia',
      situacaoDaMatricula: 'Matrícula Cancelada',
    });
    expect(r.linhas.find((l) => l.usuario === 'ana')).toMatchObject({
      situacaoDaMatricula: 'Matriculado',
    });
  });

  it('o cartão dele entra nas contagens e na média — ele fez a prova', async () => {
    const { svc } = montar({
      matriculados: [estudante('ana')],
      linhas: [linhaDoMs('ana'), linhaDoMs('bia')],
      exMatriculados: [
        estudante('bia', { applicationStatus: 'Matrícula Encerrada' }),
      ],
    });

    const r = await svc.consultar('colab', 's1');

    expect(r.resumo.totalNoRecorte).toBe(2);
    expect(r.resumo.comLeituraConcluida).toBe(2);
    expect(r.resumo.linhasSemEstudanteAtivo).toBe(0);
  });

  it('só busca no MySQL quem tem cartão e não está na lista de matriculados', async () => {
    const { svc, studentCourseRepository } = montar({
      matriculados: [estudante('ana')],
      linhas: [linhaDoMs('ana'), linhaDoMs('bia')],
    });

    await svc.consultar('colab', 's1');

    expect(
      studentCourseRepository.findPorUsuariosParaRelatorio,
    ).toHaveBeenCalledWith('cur-1', ['bia']);
  });

  it('cartão sem estudante nenhum no cursinho (registro apagado): contado, não listado', async () => {
    const { svc } = montar({
      matriculados: [estudante('ana')],
      linhas: [linhaDoMs('ana'), linhaDoMs('fantasma')],
      exMatriculados: [],
    });

    const r = await svc.consultar('colab', 's1');

    expect(r.linhas.map((l) => l.usuario)).toEqual(['ana']);
    expect(r.resumo.linhasSemEstudanteAtivo).toBe(1);
  });

  it('ex-matriculado SEM cartão não aparece — "não enviou" é só de quem está matriculado', async () => {
    const { svc } = montar({
      matriculados: [estudante('ana')],
      linhas: [],
    });

    const r = await svc.consultar('colab', 's1');

    expect(r.linhas.map((l) => l.usuario)).toEqual(['ana']);
  });

  it('⚠️ recorte de turma pede ao ms quem está OU ESTEVE na turma', async () => {
    const { svc, http } = montar({
      matriculados: [estudante('ana')],
      usuariosDaTurma: ['ana', 'bia'],
      linhas: [linhaDoMs('bia')],
      exMatriculados: [
        estudante('bia', { applicationStatus: 'Matrícula Cancelada' }),
      ],
    });

    const r = await svc.consultar('colab', 's1', 't-1');

    expect(http.buscarLinhas).toHaveBeenCalledWith('s1', 'cur-1', [
      'ana',
      'bia',
    ]);
    expect(r.linhas.map((l) => l.usuario).sort()).toEqual(['ana', 'bia']);
  });

  it('a aba de questões da turma também conta o cartão de quem saiu', async () => {
    const { svc, http } = montar({ usuariosDaTurma: ['ana', 'bia'] });

    await svc.consultarQuestoes('colab', 's1', 't-1');

    expect(http.buscarQuestoes).toHaveBeenCalledWith('s1', 'cur-1', [
      'ana',
      'bia',
    ]);
  });

  it('⚠️ dois registros do mesmo usuário viram UMA linha — o matriculado com número', async () => {
    const { svc } = montar({
      matriculados: [
        estudante('ana', { cod_enrolled: null, class: null }),
        estudante('ana'),
      ],
      linhas: [linhaDoMs('ana')],
    });

    const r = await svc.consultar('colab', 's1');

    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0].matricula).toBe('m-ana');
  });
});
