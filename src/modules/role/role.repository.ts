import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, IsNull, Not } from 'typeorm';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { Role } from './role.entity';

/** O perfil de quem não tem permissão nenhuma (seed `1-role`). */
export const ROLE_ALUNO = 'aluno';

@Injectable()
export class RoleRepository extends BaseRepository<Role> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(Role));
  }

  async create(role: Role): Promise<Role> {
    const newRole = this.repository.create(role);
    await this.repository.save(newRole);
    return newRole;
  }

  async updateRole(name: string, filter: object) {
    await this.repository
      .createQueryBuilder()
      .update(Role)
      .set(filter)
      .where('name = :name', { name })
      .execute();
  }

  async findOneBy(filter: object): Promise<Role> {
    return await this.repository
      .createQueryBuilder('role')
      .where(filter)
      .leftJoinAndSelect('role.children', 'children')
      .getOne();
  }

  async findOneByIdWithPartner(id: string): Promise<Role> {
    return await this.repository.findOne({
      where: { id },
      relations: ['partnerPrepCourse', 'roleBase'],
      cache: false,
    });
  }

  /** Perfis do projeto marcados como recomendados, sem o `aluno`. */
  async findRecommended(): Promise<Pick<Role, 'id' | 'name'>[]> {
    return await this.repository.find({
      select: { id: true, name: true },
      where: {
        isRecommended: true,
        partnerPrepCourse: IsNull(),
        name: Not(ROLE_ALUNO),
      },
      order: { name: 'ASC' },
    });
  }

  async findAll(): Promise<Role[]> {
    return await this.repository.find();
  }
}
