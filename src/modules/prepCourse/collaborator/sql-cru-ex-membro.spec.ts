import { EscopoDaFrequencia } from '../attendance/escopo/escopo-da-frequencia.service';
import { InscriptionCourseRepository } from '../InscriptionCourse/inscription-course.repository';
import { EssayService } from 'src/modules/essay/essay.service';

/**
 * Ex-membro (tickets/040) é colaborador com `deleted_at`. O TypeORM filtra
 * isso sozinho; **SQL cru não** — cada consulta escrita à mão em
 * `collaborators` tem de filtrar. Esta rede pega quem esquecer.
 */
const sqlDe = (query: jest.Mock) =>
  query.mock.calls
    .map(([sql]) => String(sql))
    .filter((sql) => /collaborators/.test(sql));

const comFiltro = (sqls: string[]) => {
  expect(sqls.length).toBeGreaterThan(0);
  for (const sql of sqls) expect(sql).toMatch(/deleted_at IS NULL/);
};

describe('SQL cru em collaborators ignora ex-membro', () => {
  it('escopo da frequência', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const escopo = new EscopoDaFrequencia({ query } as any);
    await (escopo as any).cursinhoDe('u1');
    comFiltro(sqlDe(query));
  });

  it('processo seletivo é do cursinho de quem pede', async () => {
    const query = jest.fn().mockResolvedValue([{ n: 0 }]);
    const repo = new InscriptionCourseRepository({
      query,
      getRepository: () => ({}),
    } as any);
    await repo.ehDoCursinhoDe('i1', 'u1');
    comFiltro(sqlDe(query));
  });

  it('redações do colaborador e acesso ao cursinho', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ base: false, name: 'x' }])
      .mockResolvedValue([]);
    const service = Object.create(EssayService.prototype);
    service.entityManager = { query };

    await service.validatePrepCourseAccess('p1', 'u1').catch(() => undefined);
    await service
      .findEssaysForCollaborator('u1', 1, 10, {})
      .catch(() => undefined);
    comFiltro(sqlDe(query));
    expect(sqlDe(query)).toHaveLength(2);
  });

  it('revisor de redação é do cursinho do estudante', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ base: false, name: 'x' }])
      .mockResolvedValueOnce([{ partner_prep_course_id: 'p1' }])
      .mockResolvedValue([]);
    const service = Object.create(EssayService.prototype);
    service.entityManager = { query };
    service.essayRepo = {
      findEssayById: jest.fn().mockResolvedValue({ userId: 'aluno' }),
    };

    await expect(service.validateReviewerScope('e1', 'u1')).rejects.toThrow();
    comFiltro(sqlDe(query));
  });
});
