import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Permissions } from 'src/modules/role/permissions/permissions';
import { BaseRepository } from 'src/shared/modules/base/base.repository';
import { GetAllWhereInput } from 'src/shared/modules/base/interfaces/get-all.input';
import { GetAllOutput } from 'src/shared/modules/base/interfaces/get-all.output';
import { EntityManager } from 'typeorm';
import { Collaborator } from './collaborator.entity';

@Injectable()
export class CollaboratorRepository extends BaseRepository<Collaborator> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(Collaborator));
  }

  override async findAllBy({
    page,
    limit,
    where,
  }: GetAllWhereInput): Promise<GetAllOutput<Collaborator>> {
    const [data, totalItems] = await Promise.all([
      this.repository
        .createQueryBuilder('entity')
        .orderBy('entity.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .where({ ...where })
        .andWhere('entity.deletedAt IS NULL')
        .innerJoin('entity.user', 'user')
        .addSelect([
          'user.id',
          'user.firstName',
          'user.lastName',
          'user.socialName',
          'user.email',
          'user.phone',
          'user.useSocialName',
          'user.lastAccess',
        ])
        .innerJoinAndSelect('user.role', 'role')
        .getMany(),
      this.repository
        .createQueryBuilder('entity')
        .where({ ...where })
        .getCount(),
    ]);
    return {
      data,
      page,
      limit,
      totalItems,
    };
  }

  override async findOneBy(where: object): Promise<Collaborator> {
    return await this.repository
      .createQueryBuilder('entity')
      .where({ ...where })
      .leftJoinAndSelect('entity.user', 'user')
      .getOne();
  }

  /** O cursinho do colaborador (id), sem carregar mais nada. */
  async cursinhoDoColaborador(collaboratorId: string): Promise<string | null> {
    const r = await this.repository
      .createQueryBuilder('entity')
      .select('entity.partner_prep_course_id', 'cursinhoId')
      .where('entity.id = :collaboratorId', { collaboratorId })
      .getRawOne<{ cursinhoId: string | null }>();
    return r?.cursinhoId ?? null;
  }

  /** tickets/025, card 05: colaborador ATIVO daquele cursinho. */
  async ehColaboradorAtivoDo(
    userId: string,
    partnerPrepCourseId: string,
  ): Promise<boolean> {
    const n = await this.repository
      .createQueryBuilder('entity')
      .where('entity.user_id = :userId', { userId })
      .andWhere('entity.partner_prep_course_id = :partnerPrepCourseId', {
        partnerPrepCourseId,
      })
      .andWhere('entity.actived = :ativo', { ativo: true })
      .getCount();
    return n > 0;
  }

  async findOneByUserId(id: string): Promise<Collaborator | null> {
    return await this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.user', 'user')
      .leftJoinAndSelect('entity.partnerPrepCourse', 'prep')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findOneByUserIdWithGeo(id: string): Promise<Collaborator | null> {
    return await this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.partnerPrepCourse', 'prep')
      .leftJoinAndSelect('prep.geo', 'geo')
      .innerJoin('entity.user', 'user')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findOneByPrepPartner(id: string): Promise<Collaborator[]> {
    return await this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.user', 'user')
      .leftJoinAndSelect('entity.partnerPrepCourse', 'prep')
      .where('prep.id = :id', { id })
      .getMany();
  }

  async findActiveByUserId(userId: string): Promise<Collaborator | null> {
    return this.repository.findOne({
      where: {
        user: { id: userId },
        actived: true,
      },
    });
  }

  async findActiveByUserIdWithPrep(
    userId: string,
  ): Promise<Collaborator | null> {
    return this.repository
      .createQueryBuilder('entity')
      .innerJoin('entity.user', 'user')
      .leftJoinAndSelect('entity.partnerPrepCourse', 'prep')
      .where('user.id = :userId', { userId })
      .andWhere('entity.actived = true')
      .getOne();
  }

  async findActiveByUserIdWithDetails(
    userId: string,
  ): Promise<Collaborator | null> {
    return this.repository
      .createQueryBuilder('entity')
      .innerJoin('entity.user', 'user')
      .innerJoinAndSelect('entity.partnerPrepCourse', 'ppc')
      .innerJoinAndSelect('ppc.geo', 'geo')
      .where('user.id = :userId', { userId })
      .andWhere('entity.actived = true')
      .getOne();
  }

  /**
   * Ids dos colaboradores ATIVOS do cursinho com a permissão de suporte do
   * cursinho — quem recebe o push das mensagens das conversas dele (tickets/031).
   */
  async idsDoSuporteDoCursinho(prepCourseId: string): Promise<string[]> {
    const linhas = await this.repository
      .createQueryBuilder('collaborator')
      .innerJoin('collaborator.user', 'user')
      .innerJoin('user.role', 'role')
      .select('user.id', 'id')
      .where('role.partnerPrepSupportAgent = :sim', { sim: true })
      .andWhere('collaborator.partner_prep_course_id = :prepCourseId', {
        prepCourseId,
      })
      .andWhere('collaborator.actived = :sim', { sim: true })
      .getRawMany<{ id: string }>();
    return linhas.map((l) => l.id);
  }

  async findCollaboratorsByPermission(
    permission: Permissions,
    prepCourseId: string,
  ): Promise<Collaborator[]> {
    return await this.repository
      .createQueryBuilder('collaborator')
      .innerJoinAndSelect('collaborator.user', 'user')
      .innerJoinAndSelect('user.role', 'role') // Agora podemos acessar a Role
      .where(`role.${permission} = :value`, { value: true })
      .andWhere('collaborator.partner_prep_course_id = :prepCourseId', {
        prepCourseId,
      })
      .getMany();
  }
}
