import { NotFoundException } from '@nestjs/common';
import { CartaoRespostaResultadosService } from './cartao-resposta-resultados.service';

function setup(over: any = {}) {
  const cursinhoResolver = {
    resolveCursinhoIdByUserId: jest.fn().mockResolvedValue('prep1'),
    ...over.cursinhoResolver,
  };
  const studentCourseRepository = {
    findByEnrollmentCodeAndPrepCourse: jest.fn().mockResolvedValue({
      userId: 'u-aluno',
      cod_enrolled: 'MAT1',
      user: {
        id: 'u-aluno',
        firstName: 'Ana',
        lastName: 'Silva',
        useSocialName: false,
        socialName: null,
      },
    }),
    ...over.studentCourseRepository,
  };
  const historicoService = {
    getAllByUser: jest.fn().mockResolvedValue({ data: [{ _id: 'h1' }] }),
    ...over.historicoService,
  };
  return {
    svc: new CartaoRespostaResultadosService(
      cursinhoResolver as any,
      studentCourseRepository as any,
      historicoService as any,
    ),
    cursinhoResolver,
    studentCourseRepository,
    historicoService,
  };
}

it('happy: resolve cursinho, acha aluno, últimos 10', async () => {
  const { svc, historicoService } = setup();
  const r = await svc.buscarPorMatricula('u-colab', 'MAT1');
  expect(historicoService.getAllByUser).toHaveBeenCalledWith(
    { limit: 10 },
    'u-aluno',
  );
  expect(r).toEqual({
    estudante: { userId: 'u-aluno', nome: 'Ana Silva', matricula: 'MAT1' },
    historicos: [{ _id: 'h1' }],
  });
});

it('nome social quando useSocialName', async () => {
  const { svc } = setup({
    studentCourseRepository: {
      findByEnrollmentCodeAndPrepCourse: jest.fn().mockResolvedValue({
        userId: 'u',
        cod_enrolled: 'M',
        user: {
          id: 'u',
          firstName: 'A',
          lastName: 'B',
          useSocialName: true,
          socialName: 'Nome Social',
        },
      }),
    },
  });
  const r = await svc.buscarPorMatricula('c', 'M');
  expect(r.estudante.nome).toBe('Nome Social');
});

it('aluno não encontrado → NotFound', async () => {
  const { svc } = setup({
    studentCourseRepository: {
      findByEnrollmentCodeAndPrepCourse: jest.fn().mockResolvedValue(null),
    },
  });
  await expect(svc.buscarPorMatricula('c', 'M')).rejects.toBeInstanceOf(
    NotFoundException,
  );
});

const CURSINHO = 'cursinho-1';

const montar = (encontrados: any[] = []) => {
  const cursinhoResolver = {
    resolveCursinhoIdByUserId: jest.fn().mockResolvedValue(CURSINHO),
  };
  const studentCourseRepository = {
    buscarParaEnvioDeCartao: jest.fn().mockResolvedValue(encontrados),
    findByEnrollmentCodeAndPrepCourse: jest.fn(),
  };
  const historicoService = { getAllByUser: jest.fn() };
  const svc = new CartaoRespostaResultadosService(
    cursinhoResolver as any,
    studentCourseRepository as any,
    historicoService as any,
  );
  return { svc, cursinhoResolver, studentCourseRepository, historicoService };
};

const estudante = (over: any = {}) => ({
  cod_enrolled: '20250185',
  class: { id: 't1', name: 'Turma A' },
  user: {
    id: 'u1',
    firstName: 'Cleyton',
    lastName: 'Biffe',
    socialName: null,
    useSocialName: false,
  },
  ...over,
});

describe('CartaoRespostaResultadosService.buscarEstudantes', () => {
  it('devolve nome, matricula e turma', async () => {
    const { svc } = montar([estudante()]);

    const r = await svc.buscarEstudantes('colab-1', 'Cleyton');

    expect(r.estudantes).toEqual([
      {
        userId: 'u1',
        nome: 'Cleyton Biffe',
        matricula: '20250185',
        turma: 'Turma A',
      },
    ]);
  });

  it('⚠️ o cursinho vem do JWT do colaborador, NUNCA da requisicao', async () => {
    // E o gate que impede um colaborador de enxergar — e mandar cartao para —
    // estudante de outro cursinho ao digitar um nome comum.
    const { svc, cursinhoResolver, studentCourseRepository } = montar([]);

    await svc.buscarEstudantes('colab-1', 'Ana Silva');

    expect(cursinhoResolver.resolveCursinhoIdByUserId).toHaveBeenCalledWith(
      'colab-1',
    );
    expect(
      studentCourseRepository.buscarParaEnvioDeCartao,
    ).toHaveBeenCalledWith('Ana Silva', CURSINHO, 10);
  });

  it('⚠️ termo curto devolve lista VAZIA e nao consulta o banco', async () => {
    // E o estado normal de quem esta digitando: um 400 aqui viraria toast a
    // cada tecla, e uma consulta por letra digitada.
    const { svc, studentCourseRepository, cursinhoResolver } = montar([]);

    const r = await svc.buscarEstudantes('colab-1', 'An');

    expect(r.estudantes).toEqual([]);
    expect(
      studentCourseRepository.buscarParaEnvioDeCartao,
    ).not.toHaveBeenCalled();
    expect(cursinhoResolver.resolveCursinhoIdByUserId).not.toHaveBeenCalled();
  });

  it('⚠️ tres caracteres JA buscam — e o minimo combinado', async () => {
    const { svc, studentCourseRepository } = montar([]);

    await svc.buscarEstudantes('colab-1', 'Ana');

    expect(studentCourseRepository.buscarParaEnvioDeCartao).toHaveBeenCalled();
  });

  it('espaco em volta nao conta para o minimo', async () => {
    const { svc, studentCourseRepository } = montar([]);

    await svc.buscarEstudantes('colab-1', '  An  ');

    expect(
      studentCourseRepository.buscarParaEnvioDeCartao,
    ).not.toHaveBeenCalled();
  });

  it('termo e enviado ao repositorio sem espaco em volta', async () => {
    const { svc, studentCourseRepository } = montar([]);

    await svc.buscarEstudantes('colab-1', '  Cleyton  ');

    expect(
      studentCourseRepository.buscarParaEnvioDeCartao,
    ).toHaveBeenCalledWith('Cleyton', CURSINHO, 10);
  });

  it('⚠️ usa o nome social quando o estudante pediu', async () => {
    const { svc } = montar([
      estudante({
        user: {
          id: 'u2',
          firstName: 'Jose',
          lastName: 'Souza',
          socialName: 'Maria Souza',
          useSocialName: true,
        },
      }),
    ]);

    const r = await svc.buscarEstudantes('colab-1', 'Souza');

    expect(r.estudantes[0].nome).toBe('Maria Souza');
  });

  it('⚠️ estudante sem turma vem com turma null, e nao string vazia', async () => {
    // E caso real no relatorio geral do cursinho; a tela decide como mostrar.
    const { svc } = montar([estudante({ class: null })]);

    const r = await svc.buscarEstudantes('colab-1', 'Cleyton');

    expect(r.estudantes[0].turma).toBeNull();
  });

  it('⚠️ NAO devolve historico — isso e outra tela', async () => {
    const { svc, historicoService } = montar([estudante()]);

    const r = await svc.buscarEstudantes('colab-1', 'Cleyton');

    expect(r).not.toHaveProperty('historicos');
    expect(historicoService.getAllByUser).not.toHaveBeenCalled();
  });

  it('teto de 10 resultados', async () => {
    expect(CartaoRespostaResultadosService.LIMITE_DA_BUSCA).toBe(10);
    expect(CartaoRespostaResultadosService.MINIMO_DE_CARACTERES).toBe(3);
  });
});
