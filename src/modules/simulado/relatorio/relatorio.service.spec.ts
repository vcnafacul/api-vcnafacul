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
    buscarDetalheDoEstudante: jest
      .fn()
      .mockResolvedValue(
        over.detalhe ?? { status: 'completed', respostas: [] },
      ),
    // ⚠️ Card 17 — a série de aplicações do estudante.
    buscarSerieDoEstudante: jest
      .fn()
      .mockResolvedValue({ pontos: over.pontos ?? [] }),
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

  it('⚠️ estudante sem turma continua na lista, com turma nula na LINHA', async () => {
    /*
      ⚠️ **O `temEstudanteSemTurma` do resumo saiu no card 15.** Era um booleano
      que atravessava api e client e ninguém lia — e um booleano não dá nem para
      escrever "N estudantes sem turma".

      O caso em si não sumiu, e é o que este teste passa a guardar: o estudante
      aparece na lista com `turmaId: null`, e a coluna `Turma` do client mostra
      travessão. Quem quiser a informação a tem linha a linha, que é onde ela
      é acionável — o resumo nunca chegou a mostrá-la.
    */
    const { svc } = montar({
      estudantes: [estudante({ class: null })],
      linhas: [],
    });

    const r = await svc.consultar('colab-1', 'sim-1');

    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0].turmaId).toBeNull();
    expect('temEstudanteSemTurma' in r.resumo).toBe(false);
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
  it('⚠️ manda ao ms os USUÁRIOS da turma, não o turmaId', async () => {
    /*
      Card 18: o `turmaId` gravado na junção do ms é foto do momento do upload
      e nunca é atualizado. Quem entrou na turma depois de enviar o cartão era
      filtrado fora lá, vinha do MySQL aqui, e a linha saía com
      `enviouCartao: false` — a tela AFIRMANDO que a pessoa não enviou.

      A lista de usuários é lida do MySQL a cada consulta, então é sempre a
      turma atual.
    */
    const { svc, http, studentCourseRepository } = montar({
      estudantes: [estudante({ userId: 'u1' }), estudante({ userId: 'u2' })],
    });

    await svc.consultar('colab-1', 'sim-1', 't-1');

    expect(
      studentCourseRepository.findEnrolledForRelatorio,
    ).toHaveBeenCalledWith('cur-1', 't-1');
    expect(http.buscarLinhas).toHaveBeenCalledWith('sim-1', 'cur-1', [
      'u1',
      'u2',
    ]);
  });

  it('⚠️ sem turma, NÃO manda lista — é o cursinho inteiro', async () => {
    // Mandar centenas de ids só para dizer "todos" faria o corpo crescer à toa.
    const { svc, http } = montar({
      estudantes: [estudante({ userId: 'u1' })],
    });

    await svc.consultar('colab-1', 'sim-1');

    expect(http.buscarLinhas).toHaveBeenCalledWith('sim-1', 'cur-1', undefined);
  });

  it('⚠️ turma sem ninguém matriculado NÃO consulta o ms', async () => {
    // O ms recusa `[]` de propósito (seria indistinguível de "todos"), e não
    // há o que perguntar: sem estudante, não há linha possível.
    const { svc, http } = montar({ estudantes: [] });

    const r = await svc.consultar('colab-1', 'sim-1', 't-1');

    expect(http.buscarLinhas).not.toHaveBeenCalled();
    expect(r.linhas).toEqual([]);
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

  /**
   * O card 03: o gabarito chega junto com as contagens por alternativa, porque
   * sem ele "51% marcaram B" é a turma acertando ou a turma caindo no mesmo
   * distrator — leituras opostas.
   *
   * ⚠️ Aqui a api é **cast, não transformação**: o objeto do ms sai inteiro.
   * Estes testes não podem falhar hoje — eles existem para o dia em que alguém
   * introduzir um `map` neste caminho e esquecer o campo, que é o defeito
   * clássico de proxy que deixa de ser proxy (foi o que aconteceu com
   * `consultarQuestoes` no card 18).
   */
  it('o gabarito do ms chega intacto na resposta', async () => {
    const { svc, http } = montar();
    http.buscarQuestoes.mockResolvedValue({
      questoes: [
        {
          numero: 7,
          questaoId: 'q1',
          respondentes: 20,
          acertos: 12,
          erros: 6,
          semLeitura: 2,
          porAlternativa: { A: 2, B: 12, C: 4, D: 0, E: 0 },
          alternativaCorreta: 'B',
        },
      ],
    });

    const r = await svc.consultarQuestoes('colab-1', 'sim-1');

    expect(r.questoes[0].alternativaCorreta).toBe('B');
    // ⚠️ A invariante do ms sobrevive à travessia: se um dia a api reordenar ou
    // reconstruir `porAlternativa`, é aqui que se vê.
    expect(r.questoes[0].porAlternativa['B']).toBe(r.questoes[0].acertos);
  });

  it('⚠️ gabarito `null` atravessa como null, e não vira letra nenhuma', async () => {
    // `null` é o que o ms manda quando os históricos do recorte DISCORDAM do
    // gabarito. Um `?? 'A'` bem-intencionado em qualquer ponto do caminho
    // transformaria "não sei" em "é A" — exatamente o que o card evita.
    const { svc, http } = montar();
    http.buscarQuestoes.mockResolvedValue({
      questoes: [
        {
          numero: 7,
          questaoId: 'q1',
          respondentes: 2,
          acertos: 2,
          erros: 0,
          semLeitura: 0,
          porAlternativa: { A: 1, B: 0, C: 0, D: 1, E: 0 },
          alternativaCorreta: null,
        },
      ],
    });

    const r = await svc.consultarQuestoes('colab-1', 'sim-1');

    expect(r.questoes[0].alternativaCorreta).toBeNull();
  });

  /**
   * O card 05, lado api: a discriminação atravessa como os outros campos do
   * agregado — cast, não transformação.
   *
   * ⚠️ Mesmo raciocínio do card 03: estes testes não podem falhar hoje. Eles
   * existem para o dia em que alguém introduzir um `map` neste caminho e
   * esquecer o campo — o que já aconteceu com `consultarQuestoes` no card 18.
   */
  it('a discriminação do ms chega intacta', async () => {
    const { svc, http } = montar();
    http.buscarQuestoes.mockResolvedValue({
      questoes: [
        {
          numero: 34,
          questaoId: 'q34',
          respondentes: 27,
          acertos: 6,
          erros: 19,
          semLeitura: 2,
          porAlternativa: { A: 2, B: 16, C: 6, D: 1, E: 0 },
          alternativaCorreta: 'C',
          discriminacao: -0.42,
        },
      ],
    });

    const r = await svc.consultarQuestoes('colab-1', 'sim-1');

    // ⚠️ Negativa, de propósito: é o sinal de gabarito trocado, e um
    // `Math.abs` ou um `?? 0` em qualquer ponto do caminho apagaria justamente
    // o achado mais acionável do relatório.
    expect(r.questoes[0].discriminacao).toBe(-0.42);
  });

  it('⚠️ discriminação `null` atravessa como null, e não vira zero', async () => {
    // `null` é "não há como medir" (base pequena, ou variância zero); zero é
    // "a questão não separa ninguém". São afirmações diferentes, e trocar uma
    // pela outra faz a tela mostrar um veredito onde não há medida.
    const { svc, http } = montar();
    http.buscarQuestoes.mockResolvedValue({
      questoes: [
        {
          numero: 1,
          questaoId: 'q1',
          respondentes: 4,
          acertos: 2,
          erros: 2,
          semLeitura: 0,
          porAlternativa: { A: 2, B: 2, C: 0, D: 0, E: 0 },
          alternativaCorreta: 'A',
          discriminacao: null,
        },
      ],
    });

    const r = await svc.consultarQuestoes('colab-1', 'sim-1');

    expect(r.questoes[0].discriminacao).toBeNull();
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

  it('⚠️ com turma, manda os USUÁRIOS dela — não o turmaId', async () => {
    // Deixou de ser proxy puro no card 18: o ms não consegue mais resolver a
    // turma sozinho, porque o `turmaId` da junção envelhece.
    const { svc, http } = montar({
      estudantes: [estudante({ userId: 'u7' })],
    });

    await svc.listarSimulados('colab-1', 't-1');

    expect(http.buscarSimulados).toHaveBeenCalledWith('cur-1', ['u7']);
  });

  it('⚠️ turma vazia devolve lista vazia sem chamar o ms', async () => {
    const { svc, http } = montar({ estudantes: [] });

    const r = await svc.listarSimulados('colab-1', 't-1');

    expect(http.buscarSimulados).not.toHaveBeenCalled();
    expect(r.simulados).toEqual([]);
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

describe('RelatorioService.consultarDetalhe', () => {
  it('resolve o cursinho pelo JWT — nenhum parâmetro o troca', async () => {
    const { svc, http, cursinhoResolver } = montar();

    await svc.consultarDetalhe('colab-1', 'sim-1', 'u1');

    expect(cursinhoResolver.resolveCursinhoIdByUserId).toHaveBeenCalledWith(
      'colab-1',
    );
    expect(http.buscarDetalheDoEstudante).toHaveBeenCalledWith(
      'sim-1',
      'u1',
      'cur-1',
    );
  });

  it('devolve o que o ms mandou, sem reescrever', async () => {
    const detalhe = {
      status: 'completed',
      respostas: [
        {
          numero: 1,
          questaoId: 'q1',
          alternativaEstudante: 'A',
          alternativaCorreta: 'A',
          resultado: 'acerto',
        },
      ],
    };
    const { svc } = montar({ detalhe });

    await expect(
      svc.consultarDetalhe('colab-1', 'sim-1', 'u1'),
    ).resolves.toEqual(detalhe);
  });
});

describe('RelatorioService.consultar — nota por matéria (card 02)', () => {
  /**
   * O card 02, lado api: repassar o campo novo do ms **sem reprocessar** (o ms
   * é a fonte da nota, como já era para o `aproveitamentoGeral`), e reduzir a
   * média da turma por matéria a partir das linhas.
   */
  const materias = (over: Partial<Record<string, number>> = {}) => [
    {
      id: 'm-mat',
      nome: 'Matemática',
      aproveitamento: over.mat ?? 0.3,
      frentes: [{ id: 'f-arit', nome: 'Aritmética', aproveitamento: 0.25 }],
    },
    {
      id: 'm-hum',
      nome: 'Humanas',
      aproveitamento: over.hum ?? 0.8,
      frentes: [{ id: 'f-hist', nome: 'História', aproveitamento: 0.8 }],
    },
  ];

  async function resumoDe(opts: { estudantes: any[]; linhas: any[] }) {
    const { svc } = montar(opts);
    return svc.consultar('colab', 'sim-1');
  }

  it('repassa as matérias do ms sem reprocessar', async () => {
    const r = await resumoDe({
      estudantes: [estudante()],
      linhas: [linha({ aproveitamentoPorMateria: materias() })],
    });

    expect(r.linhas[0].aproveitamentoPorMateria).toEqual(materias());
  });

  it('quem não enviou cartão não traz o campo', async () => {
    const r = await resumoDe({ estudantes: [estudante()], linhas: [] });

    expect(r.linhas[0].enviouCartao).toBe(false);
    expect(r.linhas[0].aproveitamentoPorMateria).toBeUndefined();
  });

  it('⚠️ a média por matéria sai com a BASE de cada uma', async () => {
    // "42% em Química" sobre 3 alunos é verdadeiro e inútil sem o "de 3" —
    // mesmo princípio do `indiceDeDificuldade` da aba de questões.
    const r = await resumoDe({
      estudantes: [estudante(), estudante({ userId: 'u2' })],
      linhas: [
        linha({ aproveitamentoPorMateria: materias({ mat: 0.2 }) }),
        linha({
          usuario: 'u2',
          aproveitamentoPorMateria: materias({ mat: 0.4 }),
        }),
      ],
    });

    // ⚠️ Ordem alfabética, não de chegada — ver o último teste deste describe.
    expect(r.resumo.aproveitamentoPorMateria).toEqual([
      { id: 'm-hum', nome: 'Humanas', media: 0.8, base: 2 },
      { id: 'm-mat', nome: 'Matemática', media: 0.30000000000000004, base: 2 },
    ]);
  });

  it('⚠️ estudante SEM a matéria X não entra no denominador de X', async () => {
    // Quem não teve questão de Química lida no cartão não tem Química no
    // `materias[]`. Somar tudo e dividir por `comLeituraConcluida` faria a
    // turma parecer pior em qualquer área que alguém não respondeu.
    const r = await resumoDe({
      estudantes: [estudante(), estudante({ userId: 'u2' })],
      linhas: [
        linha({ aproveitamentoPorMateria: materias({ mat: 0.4 }) }),
        linha({
          usuario: 'u2',
          aproveitamentoPorMateria: [
            { id: 'm-hum', nome: 'Humanas', aproveitamento: 0.6, frentes: [] },
          ],
        }),
      ],
    });

    const mat = r.resumo.aproveitamentoPorMateria!.find(
      (m) => m.id === 'm-mat',
    );
    expect(mat).toEqual({
      id: 'm-mat',
      nome: 'Matemática',
      media: 0.4,
      base: 1,
    });
  });

  it('⚠️ linha FALHA não entra na média, mesmo trazendo matérias', async () => {
    // Mesmo gate do `aproveitamentoGeral`: o ms já corta na origem desde este
    // card, e aqui o filtro por status continua valendo em profundidade — se
    // um dia o ms voltar a mandar, a média não muda.
    const r = await resumoDe({
      estudantes: [estudante(), estudante({ userId: 'u2' })],
      linhas: [
        linha({ aproveitamentoPorMateria: materias({ mat: 0.4 }) }),
        linha({
          usuario: 'u2',
          status: 'failed',
          aproveitamentoGeral: undefined,
          aproveitamentoPorMateria: materias({ mat: 0.9 }),
        }),
      ],
    });

    const mat = r.resumo.aproveitamentoPorMateria!.find(
      (m) => m.id === 'm-mat',
    );
    expect(mat).toMatchObject({ media: 0.4, base: 1 });
  });

  it('⚠️ recorte sem matéria nenhuma devolve AUSENTE, não lista vazia', async () => {
    // Mesma regra da linha: ausência de medida não é medida zero. `[]` faria a
    // tela desenhar um gráfico vazio afirmando que a turma não tem matérias.
    const r = await resumoDe({ estudantes: [estudante()], linhas: [] });

    expect(r.resumo.aproveitamentoPorMateria).toBeUndefined();
  });

  it('a média geral do recorte segue igual — este card não a toca', async () => {
    const r = await resumoDe({
      estudantes: [estudante(), estudante({ userId: 'u2' })],
      linhas: [
        linha({
          aproveitamentoGeral: 0.6,
          aproveitamentoPorMateria: materias(),
        }),
        linha({ usuario: 'u2', aproveitamentoGeral: 0.8 }),
      ],
    });

    expect(r.resumo.aproveitamentoGeral).toBeCloseTo(0.7);
    expect(r.resumo.comLeituraConcluida).toBe(2);
  });

  it('⚠️ a ordem das matérias não depende de quem apareceu primeiro', async () => {
    // Duas turmas com as mesmas matérias têm de desenhar o gráfico na mesma
    // ordem; senão comparar duas telas lado a lado vira quebra-cabeça.
    //
    // ⚠️ A ordem de CHEGADA aqui é Zoologia→Artes, oposta à alfabética. Com
    // nomes em que as duas coincidem o teste passaria sem o `sort` — verde
    // exatamente no caso que ele existe para pegar.
    const r = await resumoDe({
      estudantes: [estudante(), estudante({ userId: 'u2' })],
      linhas: [
        linha({
          aproveitamentoPorMateria: [
            { id: 'm-zoo', nome: 'Zoologia', aproveitamento: 0.5, frentes: [] },
          ],
        }),
        linha({
          usuario: 'u2',
          aproveitamentoPorMateria: [
            { id: 'm-art', nome: 'Artes', aproveitamento: 0.7, frentes: [] },
          ],
        }),
      ],
    });

    expect(r.resumo.aproveitamentoPorMateria!.map((m) => m.nome)).toEqual([
      'Artes',
      'Zoologia',
    ]);
  });

  it('⚠️ acentuação não joga a matéria para o fim da lista', async () => {
    // `localeCompare('pt-BR')`, e não comparação de code point: com `<` cru,
    // "Ática" viria depois de "Zoologia" porque "Á" é U+00C1.
    const r = await resumoDe({
      estudantes: [estudante(), estudante({ userId: 'u2' })],
      linhas: [
        linha({
          aproveitamentoPorMateria: [
            { id: 'm-zoo', nome: 'Zoologia', aproveitamento: 0.5, frentes: [] },
          ],
        }),
        linha({
          usuario: 'u2',
          aproveitamentoPorMateria: [
            { id: 'm-ati', nome: 'Ática', aproveitamento: 0.7, frentes: [] },
          ],
        }),
      ],
    });

    expect(r.resumo.aproveitamentoPorMateria!.map((m) => m.nome)).toEqual([
      'Ática',
      'Zoologia',
    ]);
  });
});

describe('RelatorioService.consultar — acertos absolutos (card 08)', () => {
  /**
   * O card 08, lado api: repassar `acertos` (contado no ms) e levar
   * `totalDeQuestoes` do topo da resposta do ms para o resumo.
   */
  async function consultar(over: any = {}) {
    const { svc } = montar({
      estudantes: [estudante()],
      ...over,
    });
    return svc.consultar('colab', 'sim-1');
  }

  it('repassa os acertos sem recalcular', async () => {
    const r = await consultar({ linhas: [linha({ acertos: 61 })] });

    expect(r.linhas[0].acertos).toBe(61);
  });

  it('quem não enviou cartão não tem acertos', async () => {
    const r = await consultar({ linhas: [] });

    expect(r.linhas[0].enviouCartao).toBe(false);
    expect(r.linhas[0].acertos).toBeUndefined();
  });

  it('⚠️ o total de questões vai para o RESUMO, não para cada linha', async () => {
    // É propriedade do simulado, não do estudante.
    const { svc, http } = montar({ estudantes: [estudante()] });
    http.buscarLinhas.mockResolvedValue({
      linhas: [linha({ acertos: 61 })],
      totalEstudantesComCartaoNoCursinho: 1,
      totalDeQuestoes: 90,
    });

    const r = await svc.consultar('colab', 'sim-1');

    expect(r.resumo.totalDeQuestoes).toBe(90);
    expect(r.linhas[0]).not.toHaveProperty('totalDeQuestoes');
  });

  it('⚠️ ms sem o card 08 devolve total 0, e não `undefined`', async () => {
    // Sem o `?? 0` a tela mostraria "61/undefined". Degradar para o percentual
    // sozinho é o comportamento certo durante a janela de deploy.
    const { svc, http } = montar({ estudantes: [estudante()] });
    http.buscarLinhas.mockResolvedValue({
      linhas: [linha({ acertos: undefined })],
      totalEstudantesComCartaoNoCursinho: 1,
    });

    const r = await svc.consultar('colab', 'sim-1');

    expect(r.resumo.totalDeQuestoes).toBe(0);
  });

  it('⚠️ zero acertos atravessa como ZERO, não como ausente', async () => {
    // Cartão lido em que o aluno não acertou nada é uma medida. Um `|| undefined`
    // em qualquer ponto do caminho apagaria justamente o caso extremo.
    const r = await consultar({ linhas: [linha({ acertos: 0 })] });

    expect(r.linhas[0].acertos).toBe(0);
  });

  it('recorte de turma vazio devolve total 0 sem chamar o ms', async () => {
    const { svc, http } = montar({
      estudantes: [],
      turma: { id: 't-1', partnerPrepCourse: { id: 'cur-1' } },
    });

    const r = await svc.consultar('colab', 'sim-1', 't-1');

    expect(r.resumo.totalDeQuestoes).toBe(0);
    expect(http.buscarLinhas).not.toHaveBeenCalled();
  });
});

describe('RelatorioService.consultar — identificação (card 18)', () => {
  /**
   * O card 18: a tela não dizia de que simulado era. Link colado no WhatsApp,
   * folha impressa e aba esquecida — nenhum dos três se identificava.
   */
  const doMs = (over: any = {}) => ({
    linhas: [linha()],
    totalEstudantesComCartaoNoCursinho: 1,
    totalDeQuestoes: 90,
    simuladoNome: 'ENEM 2024',
    ultimoCartaoEm: '2026-09-21T15:30:00.000Z',
    ...over,
  });

  it('repassa nome do simulado e data do último cartão', async () => {
    const { svc, http } = montar({ estudantes: [estudante()] });
    http.buscarLinhas.mockResolvedValue(doMs());

    const r = await svc.consultar('colab', 'sim-1');

    expect(r.resumo.simuladoNome).toBe('ENEM 2024');
    expect(r.resumo.ultimoCartaoEm).toBe('2026-09-21T15:30:00.000Z');
  });

  it('⚠️ o nome da TURMA vem da api, que é quem conhece o MySQL', async () => {
    // O ms guarda o `turmaId` na junção mas não sabe o nome. E hoje a única
    // pista de que `?turma=` está ativo é a coluna `Turma` desaparecer — um
    // sinal por ausência, que ninguém lê.
    const { svc, http } = montar({
      estudantes: [estudante()],
      turma: {
        id: 't-1',
        name: 'Turma 3ºA',
        partnerPrepCourse: { id: 'cur-1' },
      },
    });
    http.buscarLinhas.mockResolvedValue(doMs());

    const r = await svc.consultar('colab', 'sim-1', 't-1');

    expect(r.resumo.turmaNome).toBe('Turma 3ºA');
  });

  it('⚠️ sem recorte de turma, `turmaNome` é null', async () => {
    // A tela usa isso para não escrever um recorte que não existe.
    const { svc, http } = montar({ estudantes: [estudante()] });
    http.buscarLinhas.mockResolvedValue(doMs());

    const r = await svc.consultar('colab', 'sim-1');

    expect(r.resumo.turmaNome).toBeNull();
  });

  it('⚠️ o nome da turma NÃO custa consulta nova', async () => {
    // Ele vem do mesmo objeto que o 403 do `resolverEscopo` já busca.
    const { svc, http, classRepository } = montar({
      estudantes: [estudante()],
      turma: { id: 't-1', name: 'Turma B', partnerPrepCourse: { id: 'cur-1' } },
    });
    http.buscarLinhas.mockResolvedValue(doMs());

    await svc.consultar('colab', 'sim-1', 't-1');

    expect(classRepository.findOneByIdWithPartner).toHaveBeenCalledTimes(1);
  });

  it('simulado apagado devolve nome null e o relatório NÃO some', async () => {
    const { svc, http } = montar({ estudantes: [estudante()] });
    http.buscarLinhas.mockResolvedValue(doMs({ simuladoNome: null }));

    const r = await svc.consultar('colab', 'sim-1');

    expect(r.resumo.simuladoNome).toBeNull();
    expect(r.linhas).toHaveLength(1);
  });

  it('⚠️ turma vazia: nome null, mas `totalNoRecorte` 0 distingue o caso', async () => {
    // `null` aqui NÃO significa "simulado removido" — a turma é que está
    // vazia. A tela usa `totalNoRecorte` para não afirmar que o simulado sumiu.
    const { svc, http } = montar({
      estudantes: [],
      turma: {
        id: 't-1',
        name: 'Turma vazia',
        partnerPrepCourse: { id: 'cur-1' },
      },
    });

    const r = await svc.consultar('colab', 'sim-1', 't-1');

    expect(r.resumo.simuladoNome).toBeNull();
    expect(r.resumo.totalNoRecorte).toBe(0);
    expect(r.resumo.turmaNome).toBe('Turma vazia');
    expect(http.buscarLinhas).not.toHaveBeenCalled();
  });

  it('ms antigo (sem o card 18) degrada para null, não quebra', async () => {
    const { svc, http } = montar({ estudantes: [estudante()] });
    http.buscarLinhas.mockResolvedValue({
      linhas: [linha()],
      totalEstudantesComCartaoNoCursinho: 1,
      totalDeQuestoes: 90,
    });

    const r = await svc.consultar('colab', 'sim-1');

    expect(r.resumo.simuladoNome).toBeNull();
    expect(r.resumo.ultimoCartaoEm).toBeNull();
  });
});

describe('RelatorioService.serieDoEstudante (card 17)', () => {
  it('⚠️ o turmaId viaja até o ms — é ele que define contra QUEM comparar', async () => {
    /*
      Ao contrário do detalhe do estudante, onde turma não entra porque o
      `usuario` já identifica a pessoa. Aqui o recorte decide a média de cada
      ponto: "melhorou em relação à turma" e "em relação ao cursinho" são
      perguntas diferentes.
    */
    const { svc, http } = montar({});

    await svc.serieDoEstudante('colab-1', 'u-1', 't-9');

    expect(http.buscarSerieDoEstudante).toHaveBeenCalledWith(
      'u-1',
      'cur-1',
      't-9',
    );
  });

  it('sem turma, compara com o cursinho inteiro', async () => {
    const { svc, http } = montar({});

    await svc.serieDoEstudante('colab-1', 'u-1');

    expect(http.buscarSerieDoEstudante).toHaveBeenCalledWith(
      'u-1',
      'cur-1',
      undefined,
    );
  });

  it('⚠️ o cursinho vem do JWT, nunca da URL', async () => {
    // Mesma garantia do resto do módulo: o `resolverEscopo` resolve pelo
    // colaborador logado, e o id do cursinho nunca é aceito do chamador.
    const { svc, http } = montar({});

    await svc.serieDoEstudante('colab-1', 'u-1');

    expect(http.buscarSerieDoEstudante.mock.calls[0][1]).toBe('cur-1');
  });
});
