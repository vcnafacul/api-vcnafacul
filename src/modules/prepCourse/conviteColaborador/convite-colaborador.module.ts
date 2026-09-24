import { forwardRef, Module } from '@nestjs/common';
import { RoleModule } from 'src/modules/role/role.module';
import { UserModule } from 'src/modules/user/user.module';
import { EnvModule } from 'src/shared/modules/env/env.module';
import { EmailService } from 'src/shared/services/email/email.service';
import { CollaboratorModule } from '../collaborator/collaborator.module';
import { PartnerPrepCourseModule } from '../partnerPrepCourse/partner-prep-course.module';
import { ConviteColaboradorController } from './convite-colaborador.controller';
import { ConviteColaboradorService } from './convite-colaborador.service';

@Module({
  imports: [
    UserModule,
    RoleModule,
    EnvModule,
    forwardRef(() => CollaboratorModule),
    forwardRef(() => PartnerPrepCourseModule),
  ],
  controllers: [ConviteColaboradorController],
  providers: [ConviteColaboradorService, EmailService],
  exports: [ConviteColaboradorService],
})
export class ConviteColaboradorModule {}
