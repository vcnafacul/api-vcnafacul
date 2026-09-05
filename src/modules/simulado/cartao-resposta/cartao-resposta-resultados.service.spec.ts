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
