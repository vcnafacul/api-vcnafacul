import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { EntityManager } from 'typeorm';
import { DocumentStudent } from './document-students.entity';

@Injectable()
export class DocumentStudentRepository extends BaseRepository<DocumentStudent> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(DocumentStudent));
  }

  /** A chave é de documento de um estudante DESTE cursinho? */
  async pertenceAoCursinho(key: string, partnerPrepCourseId: string) {
    const total = await this.repository
      .createQueryBuilder('documento')
      .innerJoin('documento.studentCourse', 'estudante')
      .where('documento.key = :key', { key })
      .andWhere('estudante.partner_prep_course_id = :partnerPrepCourseId', {
        partnerPrepCourseId,
      })
      .getCount();
    return total > 0;
  }

  async deleteByStudentCourseId(studentCourseId: string): Promise<void> {
    await this.repository.delete({ studentCourse: studentCourseId });
  }
}
