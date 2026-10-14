import { getMetadataArgsStorage } from 'typeorm';
import { Collaborator } from './collaborator.entity';
import { AttendanceRecordRepository } from '../attendance/attendanceRecord/attendance-record.repository';

/**
 * Ex-membro (tickets/040) = colaborador com `deleted_at`.
 *
 * ⚠️ Só vale se `deleted_at` for `@DeleteDateColumn`: é o que faz o TypeORM
 * ignorar o ex-membro em toda consulta e join (conferido num MySQL real:
 * com `@Column` comum, o `members` do cursinho seguia resolvendo o cursinho
 * antigo). Se alguém voltar o `Collaborator` para o `BaseEntity`, isto quebra.
 */
describe('ex-membro no TypeORM', () => {
  it('Collaborator.deletedAt é @DeleteDateColumn', () => {
    const coluna = getMetadataArgsStorage().columns.find(
      (c) => c.target === Collaborator && c.propertyName === 'deletedAt',
    );
    expect(coluna?.mode).toBe('deleteDate');
  });

  it('listagem de chamadas inclui as registradas por ex-membro', async () => {
    const qb: any = {};
    for (const m of [
      'orderBy',
      'skip',
      'take',
      'withDeleted',
      'innerJoinAndSelect',
      'innerJoin',
      'addSelect',
      'where',
      'andWhere',
    ])
      qb[m] = jest.fn().mockReturnValue(qb);
    qb.getMany = jest.fn().mockResolvedValue([]);
    qb.getCount = jest.fn().mockResolvedValue(0);
    const repo = new AttendanceRecordRepository({
      getRepository: () => ({ createQueryBuilder: () => qb }),
    } as any);

    await repo.findAllBy({ page: 1, limit: 10, where: {} } as any);

    expect(qb.withDeleted).toHaveBeenCalled();
  });
});
