import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager, IsNull } from 'typeorm';
import { PeriodJustification } from './period-justification.entity';

@Injectable()
export class PeriodJustificationRepository extends BaseRepository<PeriodJustification> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(PeriodJustification));
  }

  async findOverlapping(
    studentCourseId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<PeriodJustification[]> {
    return this.repository
      .createQueryBuilder('pj')
      .where('pj.student_course_id = :studentCourseId', { studentCourseId })
      .andWhere('pj.start_date <= :endDate', { endDate })
      .andWhere('pj.end_date >= :startDate', { startDate })
      .andWhere('pj.deleted_at IS NULL')
      .getMany();
  }

  async findPaginated(
    studentCourseId: string,
    page: number,
    limit: number,
  ): Promise<{ data: PeriodJustification[]; totalItems: number }> {
    const [data, totalItems] = await this.repository.findAndCount({
      where: {
        studentCourse: { id: studentCourseId },
        deletedAt: IsNull(),
      },
      relations: ['createdBy', 'createdBy.user'],
      order: { startDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, totalItems };
  }

  async countByStudentCourse(studentCourseId: string): Promise<number> {
    return this.repository.count({
      where: {
        studentCourse: { id: studentCourseId },
        deletedAt: IsNull(),
      },
    });
  }

  async findById(id: string): Promise<PeriodJustification | null> {
    return this.repository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['studentCourse', 'studentCourse.user'],
    });
  }

  /** Quantas faltas cada justificativa de período justificou (card 06). */
  async faltasJustificadasPor(ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const linhas: { id: string; n: string }[] = await this._entityManager.query(
      `SELECT period_justification_id AS id, COUNT(*) AS n
         FROM absence_justification
        WHERE period_justification_id IN (?) AND deleted_at IS NULL
        GROUP BY period_justification_id`,
      [ids],
    );
    return new Map(linhas.map((l) => [l.id, Number(l.n)]));
  }

  /** A turma do aluno, para limpar o cache de presença. */
  async turmaDoAluno(studentCourseId: string): Promise<string | null> {
    const [r] = await this._entityManager.query(
      `SELECT classId AS turmaId FROM student_course WHERE id = ?`,
      [studentCourseId],
    );
    return r?.turmaId ?? null;
  }
}
