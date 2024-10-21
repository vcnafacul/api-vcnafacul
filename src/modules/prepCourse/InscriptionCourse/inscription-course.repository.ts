import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EntityManager } from 'typeorm';
import { PartnerPrepCourse } from '../partnerPrepCourse/partner-prep-course.entity';
import { InscriptionCourse } from './inscription-course.entity';

@Injectable()
export class InscriptionCourseRepository extends BaseRepository<InscriptionCourse> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(InscriptionCourse));
  }

  override async findOneBy(where: object): Promise<InscriptionCourse> {
    return await this.repository
      .createQueryBuilder('inscription_course')
      .where({ ...where })
      .leftJoin('inscription_course.students', 'student_course')
      .addSelect([
        'student_course.id',
        'student_course.userId',
        'student_course.rg',
        'student_course.uf',
        'student_course.cpf',
        'student_course.urgencyPhone',
      ])
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
        actived: true,
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
      .leftJoin('inscription_course.students', 'student_course')
      .addSelect([
        'student_course.createdAt',
        'student_course.email',
        'student_course.cpf',
        'student_course.rg',
        'student_course.uf',
        'student_course.urgencyPhone',
        'student_course.socioeconomic',
        'student_course.whatsapp',
      ])
      .leftJoin('student_course.user', 'user')
      .addSelect([
        'user.firstName',
        'user.lastName',
        'user.socialName',
        'user.birthday',
        'user.phone',
        'user.gender',
        'user.neighborhood',
        'user.city',
        'user.state',
        'user.street',
        'user.number',
        'user.complement',
        'user.postalCode',
      ])
      .getOne();
  }
}
