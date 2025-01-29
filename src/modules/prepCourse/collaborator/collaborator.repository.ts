import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Permissions } from 'src/modules/role/role.entity';
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
        .innerJoin('entity.user', 'user')
        .addSelect([
          'user.id',
          'user.firstName',
          'user.lastName',
          'user.socialName',
          'user.email',
          'user.phone',
        ])
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

  async findOneByUserId(id: string): Promise<Collaborator | null> {
    return await this.repository
      .createQueryBuilder('entity')
      .leftJoinAndSelect('entity.user', 'user')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findCollaboratorsByPermission(
    permission: Permissions,
  ): Promise<Collaborator[]> {
    return await this.repository
      .createQueryBuilder('collaborator')
      .innerJoin('collaborator.user', 'user')
      .innerJoin('user_roles', 'user_role', 'user_role.user_id = user.id') // Join manual na tabela pivô
      .innerJoin('user_role.role', 'role') // Agora podemos acessar a Role
      .where(`role.${permission} = :value`, { value: true })
      .getMany();
  }
}
