import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Status } from 'src/modules/simulado/enum/status.enum';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { LinkedListRepository } from 'src/shared/modules/linked/linked-list.repository';
import { EntityManager } from 'typeorm';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';
import { StudentCourse } from '../studentCourse/student-course.entity';
import { InscriptionCourse } from './inscription-course.entity';

@Injectable()
export class InscriptionCourseRepository extends LinkedListRepository<
  InscriptionCourse,
  StudentCourse
> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager, InscriptionCourse, StudentCourse);
  }

  async findOneBy(where: object): Promise<InscriptionCourse> {
    return await this.repository
      .createQueryBuilder('inscription_course')
      .where({ ...where })
      .innerJoinAndSelect(
        'inscription_course.partnerPrepCourse',
        'partnerPrepCourse',
      )
      .innerJoinAndSelect('partnerPrepCourse.geo', 'geo')
      .leftJoinAndSelect('inscription_course.students', 'student_course')
      .leftJoin('student_course.user', 'user')
      .addSelect([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.socialName',
        'user.email',
        'user.phone',
        'user.birthday',
        'user.gender',
        'user.state',
        'user.city',
      ])
      .getOne();
  }

  async findActived(
    partnerPrepCourse: PartnerPrepCourse,
  ): Promise<InscriptionCourse> {
    return await this.repository
      .createQueryBuilder('inscription_course')
      .where({
        partnerPrepCourse,
        actived: Status.Approved,
      })
      .leftJoin('inscription_course.students', 'student_course')
      .addSelect(['student_course.userId'])
      .getOne();
  }

  override async findAllBy({
    page,
    limit,
    where,
  }: GetAllWhereInput): Promise<GetAllOutput<InscriptionCourse>> {
    const [data, totalItems] = await Promise.all([
      this.repository
        .createQueryBuilder('entity')
        .orderBy('entity.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .where({ ...where })
        .andWhere('entity.deletedAt IS NULL')
        .leftJoin('entity.students', 'student_course')
        .addSelect('student_course.id')
        .leftJoin('entity.partnerPrepCourse', 'partner_prep_course')
        .addSelect(['partner_prep_course.id'])
        .leftJoin('partner_prep_course.geo', 'geo')
        .addSelect(['geo.name'])
        .getMany(),
      this.repository
        .createQueryBuilder('entity')
        .where({ ...where })
        .andWhere('entity.deletedAt IS NULL')
        .getCount(),
    ]);
    return {
      data,
      page,
      limit,
      totalItems,
    };
  }

  async getSubscribers(inscriptionId: string) {
    return await this.repository
      .createQueryBuilder('inscription_course')
      .where({ id: inscriptionId })
      .leftJoinAndSelect('inscription_course.students', 'student_course')
      .leftJoinAndSelect('student_course.user', 'user')
      .leftJoinAndSelect('student_course.legalGuardian', 'legalGuardian')
      .leftJoinAndSelect('student_course.logs', 'logs')
      .leftJoinAndSelect('student_course.documents', 'documents')
      .orderBy('logs.created_at', 'DESC') // Ordena os logs do mais recente para o mais antigo
      .orderBy('documents.created_at', 'DESC') // Ordena os logs do mais recente para o mais antigo
      .getOne();
  }

  async getWaitingList(id: string) {
    const inscription = await this.findOneBy({ id });
    const orderStudent: {
      id: string;
      position: number;
      name: string;
      email: string;
    }[] = [];
    let currentNode = inscription.students.find(
      (n) => n.id === inscription.head,
    );
    let position: number = 1;
    while (currentNode) {
      orderStudent.push({
        id: currentNode.id,
        position,
        name: `${
          currentNode.user.socialName
            ? currentNode.user.socialName
            : currentNode.user.firstName
        } ${currentNode.user.lastName}`,
        email: currentNode.user.email,
      });
      position = position + 1;
      currentNode = inscription.students.find((n) => n.id === currentNode.next);
    }
    return orderStudent;
  }

  async updateAllInscriptionsStatus(): Promise<void> {
    await this.repository.query(
      `
      UPDATE inscription_course
      SET actived = CASE
        WHEN end_date < ? THEN ?
        WHEN start_date <= ? AND end_date >= ? THEN ?
        ELSE ?
      END
      `,
      [
        new Date(), // Para ? (agora)
        Status.Rejected, // Para ? (status rejeitado)
        new Date(), // Para ? (agora, novamente)
        new Date(), // Para ? (agora, novamente)
        Status.Approved, // Para ? (status aprovado)
        Status.Pending, // Para ? (status pendente)
      ],
    );
  }
}
