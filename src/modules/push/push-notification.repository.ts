import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { BaseRepository } from '../../shared/modules/base/base.repository';
import { PushNotification } from './push-notification.entity';

@Injectable()
export class PushNotificationRepository extends BaseRepository<PushNotification> {
  constructor(
    @InjectEntityManager()
    protected readonly _entityManager: EntityManager,
  ) {
    super(_entityManager.getRepository(PushNotification));
  }

  async salvar(envio: PushNotification): Promise<PushNotification> {
    return this.repository.save(envio);
  }

  /** Histórico da tela admin (FE-06), do mais novo ao mais antigo. */
  async historico(page: number, limit: number) {
    const [data, totalItems] = await this.consultaComAutor()
      .orderBy('envio.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, page, limit, totalItems };
  }

  async detalhe(id: string): Promise<PushNotification | null> {
    return this.consultaComAutor().where('envio.id = :id', { id }).getOne();
  }

  /** ⚠️ Do autor, só id e nome — nunca a linha inteira de `users`. */
  private consultaComAutor() {
    return this.repository
      .createQueryBuilder('envio')
      .leftJoin('envio.sentBy', 'autor')
      .addSelect(['autor.id', 'autor.firstName', 'autor.lastName']);
  }
}
