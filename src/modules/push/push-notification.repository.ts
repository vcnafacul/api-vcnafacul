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
}
