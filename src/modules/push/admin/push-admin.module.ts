import { Module } from '@nestjs/common';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { UserModule } from '../../user/user.module';
import { PushModule } from '../push.module';
import { PushAdminController } from './push-admin.controller';
import { PushAdminService } from './push-admin.service';

/**
 * ⚠️ **Módulo à parte, e não dentro do `PushModule`.** O `PermissionsGuard`
 * precisa do `UserService`, e o `UserModule` já importa o `PushModule` (o
 * logout-all desativa os aparelhos): pôr este controller lá criaria um ciclo.
 */
@Module({
  // O `PermissionsGuard` usa `UserService` e `EnvService`.
  imports: [PushModule, UserModule, AuditLogModule, EnvModule],
  controllers: [PushAdminController],
  providers: [PushAdminService],
})
export class PushAdminModule {}
