import { Module } from '@nestjs/common';
import { FrenteController } from './frente.controller';
import { FrenteService } from './frente.service';
import { FrenteRepository } from './frente.repository';
import { UserRoleModule } from 'src/modules/user-role/user-role.module';
import { UserModule } from 'src/modules/user/user.module';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';

@Module({
  controllers: [FrenteController],
  imports: [UserRoleModule, UserModule],
  providers: [FrenteService, FrenteRepository, PermissionsGuard],
})
export class FrenteModule {}
