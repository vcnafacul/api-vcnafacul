import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { EntityManager, In } from 'typeorm';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { PlataformaDoAparelho, PushDevice } from './push-device.entity';
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

  /**
   * Upsert pelo `token_hash`, num único `INSERT … ON DUPLICATE KEY UPDATE`.
   *
   * ⚠️ **Atômico de propósito.** "Procura e depois grava" perde a corrida
   * quando o client registra duas vezes seguidas (login + abertura do app): as
   * duas leituras não acham nada e a segunda gravação estoura o índice único.
   *
   * No conflito, o mesmo registro: passa para o usuário atual (troca de conta
   * no mesmo navegador), é **reativado** (`deleted_at = NULL`) e renova o
   * `last_seen_at`.
   */
  async registrar(dados: {
    userId: string;
    token: string;
    tokenHash: string;
    platform: PlataformaDoAparelho;
    standalone: boolean;
    userAgent: string | null;
  }): Promise<void> {
    const agora = new Date();
    await this.repository
      .createQueryBuilder()
      .insert()
      .into(PushDevice)
      .values({
        id: randomUUID(),
        ...dados,
        lastSeenAt: agora,
        deletedAt: null,
      })
      .orUpdate(
        [
          'user_id',
          'token',
          'platform',
          'standalone',
          'user_agent',
          'last_seen_at',
          'deleted_at',
          'updated_at',
        ],
        ['token_hash'],
      )
      .execute();
  }

  async desativarPorHash(tokenHash: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(PushDevice)
      .set({ deletedAt: new Date() })
      .where('token_hash = :tokenHash', { tokenHash })
      .andWhere('deleted_at IS NULL')
      .execute();
  }

  /** "Sair de todos os dispositivos" leva os avisos junto (FE-05). */
  async desativarDoUsuario(userId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(PushDevice)
      .set({ deletedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('deleted_at IS NULL')
      .execute();
  }

  async ativosDoUsuario(userId: string): Promise<PushDevice[]> {
    return this.repository
      .createQueryBuilder('device')
      .select([
        'device.id',
        'device.platform',
        'device.standalone',
        'device.userAgent',
        'device.lastSeenAt',
      ])
      .where('device.userId = :userId', { userId })
      .andWhere('device.deletedAt IS NULL')
      .orderBy('device.lastSeenAt', 'DESC')
      .getMany();
  }

  // ─── Limpeza diária (BE-07) ──────────────────────────────────────────────

  /** Desativa os aparelhos que não aparecem desde `limite`. Devolve quantos. */
  async desativarSemUsoDesde(limite: Date, agora: Date): Promise<number> {
    const r = await this.repository
      .createQueryBuilder()
      .update(PushDevice)
      .set({ deletedAt: agora })
      .where('deleted_at IS NULL')
      .andWhere('last_seen_at < :limite', { limite })
      .execute();
    return r.affected ?? 0;
  }

  /** Apaga DE VERDADE o que foi desativado antes de `limite`. Devolve quantos. */
  async apagarDesativadosAntes(limite: Date): Promise<number> {
    const r = await this.repository
      .createQueryBuilder()
      .delete()
      .from(PushDevice)
      .where('deleted_at IS NOT NULL')
      .andWhere('deleted_at < :limite', { limite })
      .execute();
    return r.affected ?? 0;
  }
}
