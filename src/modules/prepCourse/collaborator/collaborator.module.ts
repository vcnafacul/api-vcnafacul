import { Module, forwardRef } from '@nestjs/common';
import { GeoModule } from 'src/modules/geo/geo.module';
import { RoleModule } from 'src/modules/role/role.module';
import { UserModule } from 'src/modules/user/user.module';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { BlobModule } from 'src/shared/services/blob/blob.module';
import { EmailService } from 'src/shared/services/email/email.service';
import { SimuladoModule } from 'src/modules/simulado/simulado.module';
import { PartnerPrepCourseModule } from '../partnerPrepCourse/partner-prep-course.module';
import { CollaboratorController } from './collaborator.controller';
import { CollaboratorFrenteRepository } from './collaborator-frente.repository';
import { CollaboratorRepository } from './collaborator.repository';
import { CollaboratorService } from './collaborator.service';

@Module({
  controllers: [CollaboratorController],
  imports: [
    UserModule,
    RoleModule,
    BlobModule,
    EnvModule,
    SimuladoModule,
    GeoModule,
    forwardRef(() => PartnerPrepCourseModule),
  ],
  providers: [
    CollaboratorRepository,
    CollaboratorService,
    EmailService,
    CollaboratorFrenteRepository,
  ],
  exports: [CollaboratorRepository, CollaboratorService],
})
export class CollaboratorModule {}
