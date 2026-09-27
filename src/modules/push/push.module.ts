import { Module } from '@nestjs/common';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { FirebaseModule } from 'src/shared/modules/firebase/firebase.module';
import { PushDeviceRepository } from './push-device.repository';
import { PushNotificationRepository } from './push-notification.repository';
import { PushCleanupTask } from './push-cleanup.task';
import { PushController } from './push.controller';
import { PushService } from './push.service';

/**
 * Notificações push (série `pwa-push`).
 *
 * ⚠️ Importa o `FirebaseModule` mesmo ele sendo `@Global()`: o `UserModule`
 * importa este módulo, e quem monta o `UserModule` sem o `AppModule` (os testes
 * de fiação) não teria o global registrado.
 */
@Module({
  imports: [EnvModule, FirebaseModule],
  controllers: [PushController],
  providers: [
    PushService,
    PushDeviceRepository,
    PushNotificationRepository,
    PushCleanupTask,
  ],
  exports: [PushService, PushDeviceRepository, PushNotificationRepository],
})
export class PushModule {}
