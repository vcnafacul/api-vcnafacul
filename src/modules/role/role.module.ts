import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { EmailService } from 'src/shared/services/email/email.service';
import { LogGeoRepository } from '../geo/log-geo/log-geo.repository';
import { CollaboratorRepository } from '../prepCourse/collaborator/collaborator.repository';
import { UserModule } from '../user/user.module';
import { RoleController } from './role.controller';
import { RoleRepository } from './role.repository';
import { RoleService } from './role.service';
import { RoleExistValidator } from './validator/role-exist.validator';
import { EnvModule } from 'src/shared/modules/env/env.module';

@Module({
  imports: [HttpModule, UserModule, EnvModule],
  controllers: [RoleController],
  providers: [
    RoleService,
    RoleRepository,
    RoleExistValidator,
    EmailService,
    CollaboratorRepository,
    LogGeoRepository,
  ],
  exports: [RoleService, RoleRepository],
})
export class RoleModule {}
