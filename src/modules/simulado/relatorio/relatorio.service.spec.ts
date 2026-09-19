import { ForbiddenException } from '@nestjs/common';
import { RelatorioService } from './relatorio.service';

const estudante = (over: any = {}) => ({
  userId: 'u1',
  cod_enrolled: '2025001',
  user: { firstName: 'Ana', lastName: 'Silva', useSocialName: false },
  class: { id: 't-1', name: 'Turma A' },
  ...over,
});

const linha = (over: any = {}) => ({
  usuario: 'u1',
  turmaId: 't-1',
  historicoId: 'h1',
  status: 'completed',
  cartaoCode: '7',
  questoesRespondidas: 90,
  aproveitamentoGeral: 0.8,
  ...over,
});

const montar = (over: any = {}) => {
  const http = {
    buscarLinhas: jest.fn().mockResolvedValue({
      linhas: over.linhas ?? [],
      totalEstudantesComCartaoNoCursinho: over.totalNoCursinho ?? 0,
    }),
    buscarQuestoes: jest.fn().mockResolvedValue({ questoes: [] }),
    buscarSimulados: jest
      .fn()
      .mockResolvedValue({ simulados: over.simulados ?? [] }),
  };
  const studentCourseRepository = {
    findEnrolledForRelatorio: jest
      .fn()
      .mockResolvedValue(over.estudantes ?? []),
  };
  const classRepository = {
    findOneByIdWithPartner: jest
      .fn()
      .mockResolvedValue(
        over.turma === null
          ? null
          : (over.turma ?? { id: 't-1', partnerPrepCourse: { id: 'cur-1' } }),
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
    studentCourseRepository,
    classRepository,
    cursinhoResolver,
  };
};

describe('RelatorioService.consultar', () => {
  it('hidrata a linha com nome e matrícula', async () => {
    const { svc } = montar({ estudantes: [estudante()], linhas: [linha()] });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.linhas[0]).toMatchObject({
      usuario: 'u1',
      nome: 'Ana Silva',
      matricula: '2025001',
      enviouCartao: true,
      aproveitamentoGeral: 0.8,
    });
  });

  it('usa o nome social quando o estudante pediu', async () => {
    const { svc } = montar({
      estudantes: [
        estudante({
          user: {
            firstName: 'Ana',
            lastName: 'Silva',
            socialName: 'Ana Beatriz',
            useSocialName: true,
          },
        }),
      ],
      linhas: [linha()],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.linhas[0].nome).toBe('Ana Beatriz');
  });

  it('quem NÃO enviou cartão aparece — é metade do valor do relatório', async () => {
    const { svc } = montar({
      estudantes: [estudante(), estudante({ userId: 'u2', cod_enrolled: '2' })],
      linhas: [linha()],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.linhas).toHaveLength(2);
    const u2 = r.linhas.find((l) => l.usuario === 'u2')!;
    expect(u2.enviouCartao).toBe(false);
    expect(u2.historicoId).toBeUndefined();
    expect(u2.aproveitamentoGeral).toBeUndefined();
  });

  it('a média exclui quem não teve leitura concluída, e mostra as duas contagens', async () => {
    // contar o cartão falho como zero puxaria a média para baixo e a turma
    // pareceria pior do que foi
    const { svc } = montar({
      estudantes: [
        estudante(),
        estudante({ userId: 'u2', cod_enrolled: '2' }),
        estudante({ userId: 'u3', cod_enrolled: '3' }),
      ],
      linhas: [
        linha({ aproveitamentoGeral: 0.8 }),
        linha({
          usuario: 'u2',
          status: 'failed',
          aproveitamentoGeral: undefined,
        }),
      ],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.resumo.totalNoRecorte).toBe(3);
    expect(r.resumo.comLeituraConcluida).toBe(1);
    expect(r.resumo.aproveitamentoGeral).toBeCloseTo(0.8);
  });

  it('ninguém com leitura → aproveitamento null, não zero', async () => {
    const { svc } = montar({
      estudantes: [estudante()],
      linhas: [linha({ status: 'failed', aproveitamentoGeral: undefined })],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.resumo.aproveitamentoGeral).toBeNull();
    expect(r.resumo.comLeituraConcluida).toBe(0);
  });

  it('um aproveitamento ZERO de verdade entra na média, não é tratado como ausente', async () => {
    const { svc } = montar({
      estudantes: [estudante(), estudante({ userId: 'u2', cod_enrolled: '2' })],
      linhas: [
        linha({ aproveitamentoGeral: 0 }),
        linha({ usuario: 'u2', aproveitamentoGeral: 1 }),
      ],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.resumo.comLeituraConcluida).toBe(2);
    expect(r.resumo.aproveitamentoGeral).toBeCloseTo(0.5);
  });

  it('conta a linha de quem saiu do cursinho, sem listar o nome', async () => {
    // o estudante foi desmatriculado depois de enviar; a linha fica na junção
    // do ms. Sem contar, os totais param de bater e parece que o sistema
    // perdeu cartão
    const { svc } = montar({
      estudantes: [estudante()],
      linhas: [linha(), linha({ usuario: 'u-que-saiu' })],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.linhas).toHaveLength(1);
    expect(r.resumo.linhasSemEstudanteAtivo).toBe(1);
  });

  it('avisa quando há estudante sem turma no relatório geral', async () => {
    const { svc } = montar({
      estudantes: [estudante({ class: null })],
      linhas: [],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.resumo.temEstudanteSemTurma).toBe(true);
  });

  it('repassa o total do cursinho, que alimenta o rodapé da turma', async () => {
    const { svc } = montar({ totalNoCursinho: 30 });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.resumo.totalEstudantesComCartaoNoCursinho).toBe(30);
  });

  it('cartão que falhou NÃO entra na média, mesmo trazendo nota velha', async () => {
    // o `marcarFalha` do ms não limpa `aproveitamento`: um cartão que leu bem,
    // foi refotografado e falhou mantém a nota antiga no documento. Inferir
    // "leitura concluída" da presença da nota conta esse cartão — e a aba de
    // questões, que filtra por status no ms, não conta. As duas discordariam.
    const { svc } = montar({
      estudantes: [estudante(), estudante({ userId: 'u2', cod_enrolled: '2' })],
      linhas: [
        linha({ aproveitamentoGeral: 1 }),
        linha({
          usuario: 'u2',
          status: 'failed',
          aproveitamentoGeral: 0.2,
          falha: { codigo: 'cartao_nao_detectado' },
        }),
      ],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.resumo.comLeituraConcluida).toBe(1);
    expect(r.resumo.aproveitamentoGeral).toBeCloseTo(1);
    // A linha em si mostra a nota exatamente como o ms mandou, ao lado do
    // status `failed` — a api não reescreve o que o ms disse, quem decide o
    // que renderizar dado o status é a tela.
    const u2 = r.linhas.find((l) => l.usuario === 'u2')!;
    expect(u2.status).toBe('failed');
    expect(u2.aproveitamentoGeral).toBe(0.2);
  });

  it('status que não é completed nunca entra na média', async () => {
    const { svc } = montar({
      estudantes: [
        estudante(),
        estudante({ userId: 'u2', cod_enrolled: '2' }),
        estudante({ userId: 'u3', cod_enrolled: '3' }),
      ],
      linhas: [
        linha({ aproveitamentoGeral: 1 }),
        linha({ usuario: 'u2', status: 'pending', aproveitamentoGeral: 0.5 }),
        linha({
          usuario: 'u3',
          status: 'awaiting_omr',
          aproveitamentoGeral: 0.5,
        }),
      ],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.resumo.comLeituraConcluida).toBe(1);
  });

  it('aproveitamentoGeral null vindo do ms não vira zero na média', async () => {
    const { svc } = montar({
      estudantes: [estudante(), estudante({ userId: 'u2', cod_enrolled: '2' })],
      linhas: [
        linha({ aproveitamentoGeral: 1 }),
        linha({ usuario: 'u2', aproveitamentoGeral: null as any }),
      ],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.resumo.comLeituraConcluida).toBe(1);
    expect(r.resumo.aproveitamentoGeral).toBeCloseTo(1);
  });
});

describe('RelatorioService.consultar — recorte por turma', () => {
  it('restringe a consulta de estudantes e a do ms à turma', async () => {
    const { svc, http, studentCourseRepository } = montar();

    await svc.consultar('colab-1', 'sim-1', 't-1');

    expect(
      studentCourseRepository.findEnrolledForRelatorio,
    ).toHaveBeenCalledWith('cur-1', 't-1');
    expect(http.buscarLinhas).toHaveBeenCalledWith('sim-1', 'cur-1', 't-1');
  });

  it('turma de outro cursinho é 403 — não lista vazia', async () => {
    // vazio seria indistinguível de "turma sua, ninguém matriculado"
    const { svc } = montar({
      turma: { id: 't-9', partnerPrepCourse: { id: 'cur-OUTRO' } },
    });

    await expect(svc.consultar('colab-1', 'sim-1', 't-9')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('turma inexistente é 403, não 500', async () => {
    const { svc } = montar({ turma: null });

    await expect(svc.consultar('colab-1', 'sim-1', 't-nada')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('o 403 acontece ANTES de qualquer consulta de dado', async () => {
    const { svc, http, studentCourseRepository } = montar({
      turma: { id: 't-9', partnerPrepCourse: { id: 'cur-OUTRO' } },
    });

    await expect(svc.consultar('colab-1', 'sim-1', 't-9')).rejects.toThrow();

    expect(
      studentCourseRepository.findEnrolledForRelatorio,
    ).not.toHaveBeenCalled();
    expect(http.buscarLinhas).not.toHaveBeenCalled();
  });
});

describe('RelatorioService.consultarQuestoes', () => {
  it('é proxy puro — nenhuma consulta de estudante', async () => {
    const { svc, http, studentCourseRepository } = montar();

    await svc.consultarQuestoes('colab-1', 'sim-1');

    expect(http.buscarQuestoes).toHaveBeenCalledWith(
      'sim-1',
      'cur-1',
      undefined,
    );
    expect(
      studentCourseRepository.findEnrolledForRelatorio,
    ).not.toHaveBeenCalled();
  });

  it('turma de outro cursinho é 403 aqui também', async () => {
    const { svc } = montar({
      turma: { id: 't-9', partnerPrepCourse: { id: 'cur-OUTRO' } },
    });

    await expect(
      svc.consultarQuestoes('colab-1', 'sim-1', 't-9'),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('RelatorioService.listarSimulados', () => {
  it('resolve o cursinho pelo JWT e repassa — nenhum parâmetro o troca', async () => {
    const { svc, http, cursinhoResolver } = montar();

    await svc.listarSimulados('colab-1');

    expect(cursinhoResolver.resolveCursinhoIdByUserId).toHaveBeenCalledWith(
      'colab-1',
    );
    expect(http.buscarSimulados).toHaveBeenCalledWith('cur-1', undefined);
  });

  it('com turma, repassa as duas coisas', async () => {
    const { svc, http } = montar();

    await svc.listarSimulados('colab-1', 't-1');

    expect(http.buscarSimulados).toHaveBeenCalledWith('cur-1', 't-1');
  });

  it('turma de outro cursinho dá 403, e o ms nem é chamado', async () => {
    // é o `resolverEscopo` do card 04 fazendo o trabalho — não uma validação
    // nova. Se esta rota tivesse a sua própria, as duas divergiriam.
    const { svc, http } = montar({ turma: null });

    await expect(svc.listarSimulados('colab-1', 't-alheia')).rejects.toThrow(
      ForbiddenException,
    );
    expect(http.buscarSimulados).not.toHaveBeenCalled();
  });

  it('devolve o que o ms mandou, sem reescrever', async () => {
    const simulados = [
      {
        simuladoId: 's1',
        nome: 'ENEM',
        cartoes: 3,
        comLeituraConcluida: 2,
        ultimoEnvio: '2026-05-02T00:00:00.000Z',
      },
    ];
    const { svc } = montar({ simulados });

    await expect(svc.listarSimulados('colab-1')).resolves.toEqual({
      simulados,
    });
  });
});
