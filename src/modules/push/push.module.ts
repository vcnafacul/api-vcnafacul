import { Module } from '@nestjs/common';

/**
 * Notificações push (série `pwa-push`). As entidades (`push_device`,
 * `push_notification`) entram pelo glob de `*.entity.ts`; endpoints e envio
 * chegam no BE-04/BE-05.
 */
@Module({})
export class PushModule {}
