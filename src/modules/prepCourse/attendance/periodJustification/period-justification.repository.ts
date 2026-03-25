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
}
