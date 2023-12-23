import { Module } from '@nestjs/common';
import { SubjectController } from './subject.controller';
import { SubjectService } from './subject.service';
import { SubjectRepository } from './subject.repository';
import { FrenteRepository } from '../frente/frente.repository';
import { PermissionsGuard } from 'src/shared/guards/permission.guard';
import { UserRoleModule } from 'src/modules/user-role/user-role.module';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  controllers: [SubjectController],
  imports: [UserRoleModule, UserModule],
  providers: [
    SubjectService,
    SubjectRepository,
    FrenteRepository,
    PermissionsGuard,
  ],
})
export class SubjectModule {}
