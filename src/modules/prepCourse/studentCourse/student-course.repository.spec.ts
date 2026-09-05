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
