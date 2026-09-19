import { StudentCourseRepository } from './student-course.repository';

it('findByEnrollmentCodeAndPrepCourse filtra por cod_enrolled + prepCourse', async () => {
  const qb: any = {};
  qb.where = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.innerJoinAndSelect = jest.fn().mockReturnValue(qb);
  qb.getOne = jest.fn().mockResolvedValue({ id: 'sc1' });
  const entityManager: any = {
    getRepository: () => ({ createQueryBuilder: () => qb }),
  };
  const repo = new StudentCourseRepository(entityManager);
  const r = await repo.findByEnrollmentCodeAndPrepCourse('MAT1', 'prep1');
  expect(r).toEqual({ id: 'sc1' });
  expect(qb.where).toHaveBeenCalledWith(
    'entity.cod_enrolled = :enrollmentCode',
    {
      enrollmentCode: 'MAT1',
    },
  );
  expect(qb.andWhere).toHaveBeenCalledWith(
    'partnerPrepCourse.id = :prepCourseId',
    { prepCourseId: 'prep1' },
  );
});

describe('StudentCourseRepository.findByUserIdAndPrepCourse', () => {
  const montar = () => {
    const qb: any = {};
    qb.innerJoin = jest.fn().mockReturnValue(qb);
    qb.leftJoinAndSelect = jest.fn().mockReturnValue(qb);
    qb.where = jest.fn().mockReturnValue(qb);
    qb.andWhere = jest.fn().mockReturnValue(qb);
    qb.getOne = jest.fn().mockResolvedValue({ id: 's1', class: { id: 't-1' } });
    const repository = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    // ⚠️ O construtor recebe um EntityManager e chama `getRepository(StudentCourse)`
    // no super — não o repositório direto.
    const entityManager = {
      getRepository: jest.fn().mockReturnValue(repository),
    };
    const repo = new StudentCourseRepository(entityManager as any);
    return { repo, qb };
  };

  it('filtra por usuário E cursinho, e traz a turma junto', async () => {
    const { repo, qb } = montar();

    const r = await repo.findByUserIdAndPrepCourse('u1', 'cur-1');

    expect(r?.class?.id).toBe('t-1');
    // Provado por mutação: trocar {userId} por {prepCourseId} nas duas chamadas
    // deixava o teste anterior verde, porque ele só checava se a string junta
    // continha os dois valores — não qual clausula levava qual parâmetro.
    expect(qb.where).toHaveBeenCalledWith('user.id = :userId', {
      userId: 'u1',
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      'partnerPrepCourse.id = :prepCourseId',
      { prepCourseId: 'cur-1' },
    );
    // sem a turma carregada, o vínculo iria para o ms sem turmaId
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
      'entity.class',
      expect.any(String),
    );
  });
});
