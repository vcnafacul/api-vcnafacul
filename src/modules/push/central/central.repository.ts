import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Brackets, EntityManager, IsNull, LessThan } from 'typeorm';
import { BaseRepository } from '../../../shared/modules/base/base.repository';
import { User } from '../../user/user.entity';
import { PublicoDoEnvio } from '../push-notification.entity';
import { NotificacaoDoUsuario } from './notificacao-do-usuario.entity';

/** Insert em lote: um envio para "Todos" vira uma linha por usuário. */
export const TAMANHO_DO_LOTE = 1000;

export type ConteudoDaNotificacao = {
  titulo: string;
  corpo: string;
  url: string | null;
  pushNotificationId?: string | null;
};

@Injectable()
export class CentralRepository extends BaseRepository<NotificacaoDoUsuario> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(NotificacaoDoUsuario));
  }

  /**
   * Ids de TODAS as pessoas de um público — a mesma regra do
   * `ativosDoPublico`, mas por conta e não por aparelho: quem não ativou o
   * push também entra na central.
   *
   * ⚠️ Filtra a conta apagada (soft delete).
   */
  async usuariosDoPublico(publico: PublicoDoEnvio): Promise<string[]> {
    const qb = this._entityManager
      .getRepository(User)
      .createQueryBuilder('user')
      .select('user.id', 'id')
      .where('user.deletedAt IS NULL');

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

    return (await qb.getRawMany()).map((l) => l.id);
  }

  /**
   * O que a pessoa vê: não lidas + lidas depois de `lidasDesde` (1 hora atrás),
   * da mais nova para a mais antiga.
   */
  async daPessoa(
    userId: string,
    lidasDesde: Date,
    page: number,
    limit: number,
  ) {
    const [data, totalItems] = await this.repository
      .createQueryBuilder('n')
      .select([
        'n.id',
        'n.titulo',
        'n.corpo',
        'n.url',
        'n.lidaEm',
        'n.createdAt',
      ])
      .where('n.userId = :userId', { userId })
      .andWhere(
        new Brackets((b) =>
          b
            .where('n.lidaEm IS NULL')
            .orWhere('n.lidaEm > :lidasDesde', { lidasDesde }),
        ),
      )
      .orderBy('n.createdAt', 'DESC')
      .addOrderBy('n.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, totalItems };
  }

  async naoLidas(userId: string): Promise<number> {
    return this.repository.count({ where: { userId, lidaEm: IsNull() } });
  }

  /** Só a da própria pessoa, e só se ainda não lida. Devolve se existe. */
  async marcarLida(userId: string, id: string, agora: Date): Promise<boolean> {
    const r = await this.repository.update(
      { id, userId, lidaEm: IsNull() },
      { lidaEm: agora },
    );
    if (r.affected) return true;
    // Já lida também é "existe": o PATCH é idempotente.
    return this.repository.exists({ where: { id, userId } });
  }

  async marcarTodas(userId: string, agora: Date): Promise<number> {
    const r = await this.repository.update(
      { userId, lidaEm: IsNull() },
      { lidaEm: agora },
    );
    return r.affected ?? 0;
  }

  /** Limpeza diária (card 02). Apaga de verdade: não tem valor histórico. */
  async apagarLidasAntes(limite: Date): Promise<number> {
    const r = await this.repository.delete({
      lidaEm: LessThan(limite),
    });
    return r.affected ?? 0;
  }

  async apagarNaoLidasAntes(limite: Date): Promise<number> {
    const r = await this.repository.delete({
      lidaEm: IsNull(),
      createdAt: LessThan(limite),
    });
    return r.affected ?? 0;
  }

  async gravar(
    userIds: string[],
    conteudo: ConteudoDaNotificacao,
  ): Promise<void> {
    await gravarNaCentral(this._entityManager, userIds, conteudo);
  }
}

/**
 * Uma linha por usuário, em lotes. Função solta para rodar dentro da
 * transação de quem chama (o envio grava `push_notification` + central juntos).
 */
export async function gravarNaCentral(
  manager: EntityManager,
  userIds: string[],
  conteudo: ConteudoDaNotificacao,
): Promise<void> {
  for (let i = 0; i < userIds.length; i += TAMANHO_DO_LOTE) {
    const linhas = userIds.slice(i, i + TAMANHO_DO_LOTE).map((userId) => ({
      id: randomUUID(),
      userId,
      titulo: conteudo.titulo,
      corpo: conteudo.corpo,
      url: conteudo.url,
      pushNotificationId: conteudo.pushNotificationId ?? null,
    }));
    await manager.insert(NotificacaoDoUsuario, linhas);
  }
}
