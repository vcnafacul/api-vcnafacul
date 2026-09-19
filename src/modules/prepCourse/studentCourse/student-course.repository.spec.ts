import { StudentCourseRepository } from './student-course.repository';

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
    // o escopo por cursinho é o que impede enviar cartão de aluno de outro cursinho
    const clausulas = [...qb.where.mock.calls, ...qb.andWhere.mock.calls]
      .map((c) => JSON.stringify(c))
      .join(' ');
    expect(clausulas).toContain('u1');
    expect(clausulas).toContain('cur-1');
    // sem a turma carregada, o vínculo iria para o ms sem turmaId
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
      'entity.class',
      expect.any(String),
    );
  });
});
