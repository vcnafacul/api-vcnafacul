import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EntityManager, In } from 'typeorm';
import { Collaborator } from '../collaborator/collaborator.entity';
import { StatusApplication } from '../studentCourse/enums/stastusApplication';
import { StudentCourse } from '../studentCourse/student-course.entity';
import { PartnerPrepCourse } from './partner-prep-course.entity';

export interface ContagemDoCursinho {
  numberStudents: number;
  numberMembers: number;
}

@Injectable()
export class PartnerPrepCourseRepository extends BaseRepository<PartnerPrepCourse> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(PartnerPrepCourse));
  }

  override async findOneBy(where: object): Promise<PartnerPrepCourse> {
    return await this.repository
      .createQueryBuilder('partner_prep_course')
      .where({ ...where })
      .leftJoin('partner_prep_course.inscriptionCourses', 'inscription_course')
      .addSelect([
        'inscription_course.id',
        'inscription_course.name',
        'inscription_course.description',
        'inscription_course.actived',
        'inscription_course.endDate',
        'inscription_course.startDate',
      ])
      .innerJoinAndSelect('partner_prep_course.geo', 'geo')
      .leftJoinAndSelect('partner_prep_course.members', 'members')
      .leftJoin('members.user', 'user')
      .addSelect(['user.id', 'user.email'])
      .getOne();
  }

  async findOneByUserId(id: string): Promise<PartnerPrepCourse> {
    return await this.repository
      .createQueryBuilder('partner_prep_course')
      .leftJoin('partner_prep_course.inscriptionCourses', 'inscription_course')
      .addSelect([
        'inscription_course.id',
        'inscription_course.actived',
        'inscription_course.endDate',
      ])
      .innerJoinAndSelect('partner_prep_course.geo', 'geo')
      .leftJoinAndSelect('partner_prep_course.members', 'members')
      .leftJoin('members.user', 'user')
      .addSelect(['user.id', 'user.email'])
      .where('user.id = :id', { id })
      .getOne();
  }

  async findOneById(id: string): Promise<PartnerPrepCourse> {
    return await this.repository
      .createQueryBuilder('partner_prep_course')
      .innerJoinAndSelect('partner_prep_course.geo', 'geo')
      .innerJoinAndSelect(
        'partner_prep_course.representative',
        'representative',
      )
      .where('partner_prep_course.id = :id', { id })
      .getOne();
  }

  async findAllBy({
    page,
    limit,
    where,
  }: GetAllWhereInput): Promise<GetAllOutput<PartnerPrepCourse>> {
    const [data, totalItems] = await Promise.all([
      this.repository
        .createQueryBuilder('partner_prep_course')
        .innerJoin('partner_prep_course.geo', 'geo')
        .addSelect([
          'geo.id',
          'geo.name',
          'geo.category',
          'geo.street',
          'geo.number',
          'geo.complement',
          'geo.neighborhood',
          'geo.city',
          'geo.state',
          'geo.phone',
        ])
        .innerJoin('partner_prep_course.representative', 'representative')
        .addSelect([
          'representative.id',
          'representative.firstName',
          'representative.lastName',
          'representative.socialName',
          'representative.useSocialName',
          'representative.email',
          'representative.phone',
        ])
        .orderBy('partner_prep_course.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .where({ ...where })
        .getMany(),
      this.repository.count({ where }),
    ]);
    return {
      data,
      page,
      limit,
      totalItems,
    };
  }

  async getTotalEntity() {
    return this.repository
      .createQueryBuilder('entity')
      .where('entity.deletedAt IS NULL')
      .getCount();
  }

  //criar um findOne que retorne o mesmo que o findAllBy, mas que retorne apenas um objeto
  async findAllLogos(): Promise<PartnerPrepCourse[]> {
    return await this.repository
      .createQueryBuilder('partner_prep_course')
      .select(['partner_prep_course.id', 'partner_prep_course.logo'])
      .innerJoin('partner_prep_course.geo', 'geo')
      .addSelect(['geo.name', 'geo.site'])
      .where('partner_prep_course.logo IS NOT NULL')
      .getMany();
  }

  async findOneByIdRes(id: string): Promise<PartnerPrepCourse> {
    return await this.repository
      .createQueryBuilder('partner_prep_course')
      .innerJoin('partner_prep_course.geo', 'geo')
      .addSelect([
        'geo.id',
        'geo.name',
        'geo.category',
        'geo.street',
        'geo.number',
        'geo.complement',
        'geo.neighborhood',
        'geo.city',
        'geo.state',
        'geo.phone',
      ])
      .innerJoin('partner_prep_course.representative', 'representative')
      .addSelect([
        'representative.id',
        'representative.firstName',
        'representative.lastName',
        'representative.socialName',
        'representative.useSocialName',
        'representative.email',
        'representative.phone',
      ])
      .where({ id })
      .getOne();
  }

  /**
   * Nome de cada cursinho (o do mapa, `geo.name`), numa consulta só
   * (tickets/023, card 07 — selo "Prova do cursinho X"). Sem N+1.
   */
  async nomesPorId(ids: string[]): Promise<Map<string, string>> {
    if (!ids.length) return new Map();
    const cursinhos = await this.repository.find({
      where: { id: In(ids) },
      relations: ['geo'],
    });
    return new Map(cursinhos.map((c) => [c.id, c.geo?.name ?? '']));
  }

  /**
   * Estudantes matriculados (mesma regra do `countStudentsCurrentlyEnrolled`:
   * status `Matriculado`, um por usuário) e colaboradores ativos de cada
   * cursinho, em duas consultas agregadas. Contado na leitura — sem contador
   * persistido, então não há o que reconciliar.
   */
  async contagensPorCursinho(
    ids: string[],
  ): Promise<Map<string, ContagemDoCursinho>> {
    const contagens = new Map<string, ContagemDoCursinho>(
      ids.map((id) => [id, { numberStudents: 0, numberMembers: 0 }]),
    );
    if (!ids.length) return contagens;

    const [estudantes, membros] = await Promise.all([
      this._entityManager
        .getRepository(StudentCourse)
        .createQueryBuilder('sc')
        .select('sc.partner_prep_course_id', 'id')
        .addSelect('COUNT(DISTINCT sc.user_id)', 'total')
        .where('sc.partner_prep_course_id IN (:...ids)', { ids })
        .andWhere('sc.applicationStatus = :status', {
          status: StatusApplication.Enrolled,
        })
        .andWhere('sc.deletedAt IS NULL')
        .groupBy('sc.partner_prep_course_id')
        .getRawMany<{ id: string; total: string }>(),
      this._entityManager
        .getRepository(Collaborator)
        .createQueryBuilder('c')
        .select('c.partner_prep_course_id', 'id')
        .addSelect('COUNT(c.id)', 'total')
        .where('c.partner_prep_course_id IN (:...ids)', { ids })
        .andWhere('c.actived = :ativo', { ativo: true })
        .andWhere('c.deletedAt IS NULL')
        .groupBy('c.partner_prep_course_id')
        .getRawMany<{ id: string; total: string }>(),
    ]);

    estudantes.forEach(({ id, total }) => {
      contagens.get(id).numberStudents = Number(total);
    });
    membros.forEach(({ id, total }) => {
      contagens.get(id).numberMembers = Number(total);
    });
    return contagens;
  }
}
