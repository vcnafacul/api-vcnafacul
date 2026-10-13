import { StatusApplication } from '../studentCourse/enums/stastusApplication';
import { StudentCourseRepository } from '../studentCourse/student-course.repository';
import { InscriptionCourseRepository } from './inscription-course.repository';
import { InscriptionCourseService } from './inscription-course.service';

const queryBuilder = (result: unknown) => {
  const qb: any = {};
  for (const m of [
    'leftJoinAndSelect',
    'innerJoin',
    'select',
    'addSelect',
    'where',
    'andWhere',
  ]) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb.getMany = jest.fn().mockResolvedValue(result);
  qb.getRawMany = jest.fn().mockResolvedValue(result);
  return qb;
};

describe('Processos seletivos abertos', () => {
  it('não lista processos marcados como teste', async () => {
    const qb = queryBuilder([]);
    const entityManager: any = {
      getRepository: () => ({ createQueryBuilder: () => qb }),
    };
    await new InscriptionCourseRepository(entityManager).findOpen();
    expect(qb.andWhere).toHaveBeenCalledWith('ic.isTest = :isTest', {
      isTest: false,
    });
  });

  it('busca a situação do usuário só nos processos pedidos', async () => {
    const qb = queryBuilder([
      { inscriptionId: 'ic1', status: StatusApplication.UnderReview },
    ]);
    const entityManager: any = {
      getRepository: () => ({ createQueryBuilder: () => qb }),
    };
    const repo = new StudentCourseRepository(entityManager);

    const r = await repo.findStatusByUserInInscriptions('u1', ['ic1', 'ic2']);

    expect(r).toEqual([
      { inscriptionId: 'ic1', status: StatusApplication.UnderReview },
    ]);
    expect(qb.where).toHaveBeenCalledWith('entity.userId = :userId', {
      userId: 'u1',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('ic.id IN (:...inscriptionIds)', {
      inscriptionIds: ['ic1', 'ic2'],
    });
  });

  it('sem processos, não consulta a situação', async () => {
    const qb = queryBuilder([]);
    const entityManager: any = {
      getRepository: () => ({ createQueryBuilder: () => qb }),
    };
    const repo = new StudentCourseRepository(entityManager);

    expect(await repo.findStatusByUserInInscriptions('u1', [])).toEqual([]);
    expect(qb.getRawMany).not.toHaveBeenCalled();
  });

  it('junta a situação do usuário a cada processo aberto', async () => {
    const repository = {
      findOpen: jest.fn().mockResolvedValue([
        { id: 'ic1', name: 'P1', endDate: new Date(), partnerPrepCourse: null },
        { id: 'ic2', name: 'P2', endDate: new Date(), partnerPrepCourse: null },
      ]),
    };
    const studentRepository = {
      findStatusByUserInInscriptions: jest
        .fn()
        .mockResolvedValue([
          { inscriptionId: 'ic2', status: StatusApplication.DeclaredInterest },
        ]),
    };
    const cache = { wrap: (_key: string, fn: () => unknown) => fn() };
    const service = new InscriptionCourseService(
      repository as any,
      studentRepository as any,
      null,
      null,
      null,
      null,
      cache as any,
      null,
    );

    const r = await service.findOpenForUser('u1');

    expect(
      studentRepository.findStatusByUserInInscriptions,
    ).toHaveBeenCalledWith('u1', ['ic1', 'ic2']);
    expect(r.map((ic) => [ic.id, ic.studentStatus])).toEqual([
      ['ic1', null],
      ['ic2', StatusApplication.DeclaredInterest],
    ]);
  });
});
