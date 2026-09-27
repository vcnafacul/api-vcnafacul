import { Module } from '@nestjs/common';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { PushDeviceRepository } from './push-device.repository';
import { PushNotificationRepository } from './push-notification.repository';
import { PushService } from './push.service';

/**
 * Notificações push (série `pwa-push`). O `FirebaseService` vem do
 * `FirebaseModule`, que é global.
 */
@Module({
  imports: [EnvModule],
  providers: [PushService, PushDeviceRepository, PushNotificationRepository],
  exports: [PushService, PushDeviceRepository],
})
export class PushModule {}
