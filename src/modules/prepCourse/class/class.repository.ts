import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EntityManager } from 'typeorm';
import { StatusApplication } from '../studentCourse/enums/stastusApplication';
import { Class } from './class.entity';

@Injectable()
export class ClassRepository extends BaseRepository<Class> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(Class));
  }

  async delete(id: string): Promise<void> {
    const classEntity = await this.repository.findOneBy({ id });
    if (!classEntity) {
      throw new HttpException(
        `Class not found by id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    classEntity.deletedAt = new Date();
    await this.repository.save(classEntity);
  }

  override async findAllBy({
    page,
    limit,
    where,
  }: GetAllWhereInput): Promise<GetAllOutput<Class>> {
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
        .leftJoinAndSelect('entity.coursePeriod', 'course_period')
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

  async findOneById(id: string): Promise<Class> {
    return this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.students', 'student_course')
      .leftJoin('student_course.user', 'user')
      .addSelect([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.socialName',
        'user.email',
        'user.birthday',
        'user.useSocialName',
      ])
      .leftJoinAndSelect('entity.admins', 'admins')
      .leftJoinAndSelect('entity.coursePeriod', 'course_period')
      .where('entity.id = :id', { id })
      .getOne();
  }

  async findOneByIdToAttendanceRecord(id: string): Promise<Class> {
    return this.repository
      .createQueryBuilder('entity')
      .leftJoin('entity.students', 'student_course')
      .addSelect(['student_course.id', 'student_course.cod_enrolled'])
      .leftJoin('student_course.user', 'user')
      .addSelect([
        'user.firstName',
        'user.lastName',
        'user.socialName',
        'user.useSocialName',
      ])
      .leftJoinAndSelect('entity.coursePeriod', 'course_period')
      .where('entity.id = :id', { id })
      .andWhere('student_course.applicationStatus = :status', {
        status: StatusApplication.Enrolled,
      })
      .getOne();
  }

  async findOneByIdWithPartner(id: string): Promise<Class> {
    return this.repository
      .createQueryBuilder('entity')
      .innerJoin('entity.partnerPrepCourse', 'partner_prep_course')
      .addSelect(['partner_prep_course.id'])
      .leftJoinAndSelect('entity.coursePeriod', 'course_period')
      .where('entity.id = :id', { id })
      .getOne();
  }
}
