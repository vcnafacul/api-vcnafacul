import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { PushDevice } from './push-device.entity';
import { PublicoDoEnvio } from './push-notification.entity';

/** O mínimo que o envio precisa de cada aparelho. */
export type AparelhoDoPublico = Pick<PushDevice, 'id' | 'token' | 'userId'>;

@Injectable()
export class PushDeviceRepository extends BaseRepository<PushDevice> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(PushDevice));
  }

  /**
   * Aparelhos ativos de um público.
   *
   * ⚠️ **Filtra o USUÁRIO apagado também.** A conta é apagada por soft delete,
   * então o `ON DELETE CASCADE` do `push_device` não dispara — sem o filtro,
   * quem excluiu a conta continuaria recebendo.
   */
  async ativosDoPublico(publico: PublicoDoEnvio): Promise<AparelhoDoPublico[]> {
    const qb = this.repository
      .createQueryBuilder('device')
      .innerJoin('device.user', 'user')
      .select(['device.id', 'device.token', 'device.userId'])
      .where('device.deletedAt IS NULL')
      .andWhere('user.deletedAt IS NULL');

    switch (publico.type) {
      case 'all':
        break;
      case 'users':
        if (!publico.userIds.length) return [];
        qb.andWhere('user.id IN (:...ids)', { ids: publico.userIds });
        break;
      case 'emails': {
        const emails = publico.emails
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
        if (!emails.length) return [];
        qb.andWhere('LOWER(user.email) IN (:...emails)', { emails });
        break;
      }
      case 'roles':
        if (!publico.roleIds.length) return [];
        qb.innerJoin('user.role', 'role').andWhere('role.id IN (:...ids)', {
          ids: publico.roleIds,
        });
        break;
    }

    return qb.getMany();
  }

  /** Soft delete dos aparelhos cujo token o FCM recusou. */
  async desativar(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.repository.update({ id: In(ids) }, { deletedAt: new Date() });
  }
}
